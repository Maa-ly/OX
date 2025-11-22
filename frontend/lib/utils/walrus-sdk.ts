/**
 * Walrus SDK utilities for direct user payments
 * Users pay with WAL tokens from their own wallets
 * 
 * Reference: https://sdk.mystenlabs.com/walrus
 */

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getFullnodeUrl } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { WalrusFile } from '@mysten/walrus';
import type { Signer } from '@mysten/sui/cryptography';
import { estimateWalrusCost } from './wal-balance';

/**
 * Wallet adapter interface compatible with Suiet Wallet Kit and other wallet adapters
 * Uses 'any' to be compatible with different wallet adapter implementations
 * The wallet from useWallet() hook provides this interface
 */
export type WalletAdapter = any;

/**
 * Create a Signer adapter that wraps the wallet adapter
 * This allows the Walrus SDK to use the wallet adapter as a Signer
 */
function createWalletSigner(wallet: WalletAdapter, network: 'testnet' | 'mainnet' = 'testnet'): Signer {
  if (!wallet || !wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const walletAddress = wallet.account.address;

  return {
    getAddress: () => walletAddress,
    signData: async (data: Uint8Array) => {
      // This shouldn't be called directly by Walrus SDK
      throw new Error('signData not implemented - use signAndExecuteTransaction instead');
    },
    signTransactionBlock: async (transactionBlock: Uint8Array | Transaction) => {
      // The Walrus SDK will call this with a Transaction object
      // We need to convert it to the format the wallet adapter expects
      console.log('[createWalletSigner] signTransactionBlock called', {
        type: typeof transactionBlock,
        isTransaction: transactionBlock instanceof Transaction,
        isUint8Array: transactionBlock instanceof Uint8Array,
      });

      // If it's already a Uint8Array, use it directly
      if (transactionBlock instanceof Uint8Array) {
        const result = await wallet.signTransactionBlock({
          transactionBlock: transactionBlock,
        });
        return {
          signature: result.signature,
          transactionBlockBytes: result.bytes,
        };
      }

      // If it's a Transaction object, we need to build it first
      if (transactionBlock instanceof Transaction) {
        const suiClient = new SuiClient({
          url: getFullnodeUrl(network),
        });

        // Set sender if not already set
        if (typeof transactionBlock.setSender === 'function' && walletAddress) {
          try {
            transactionBlock.setSender(walletAddress);
          } catch (e) {
            // Sender might already be set
          }
        }

        // Build the transaction
        const builtTx = await transactionBlock.build({ client: suiClient });

        // Sign with wallet
        const result = await wallet.signTransactionBlock({
          transactionBlock: builtTx,
        });

        return {
          signature: result.signature,
          transactionBlockBytes: result.bytes,
        };
      }

      throw new Error('Unsupported transaction block type');
    },
    toSuiAddress: () => walletAddress,
  } as unknown as Signer;
}

/**
 * Helper function to sign and execute a transaction using the wallet adapter
 * This matches the pattern shown in Walrus SDK docs: signAndExecuteTransaction({ transaction: tx })
 * 
 * @param transaction - Transaction object from flow.register() or flow.certify()
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result containing digest
 */
async function signAndExecuteTransaction({
  transaction,
  wallet,
  network = 'testnet',
  estimatedCostMist,
}: {
  transaction: Transaction;
  wallet: WalletAdapter;
  network?: 'testnet' | 'mainnet';
  estimatedCostMist?: number; // Optional: estimated WAL cost in MIST for logging
}): Promise<{ digest: string }> {
  if (!wallet || !wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  console.log('[signAndExecuteTransaction] About to prepare transaction', {
    hasWallet: !!wallet,
    walletConnected: wallet?.connected,
    hasSignMethod: typeof wallet?.signAndExecuteTransactionBlock === 'function',
    transactionType: typeof transaction,
    isTransaction: transaction instanceof Transaction,
    hasBuild: typeof transaction?.build === 'function',
    hasSetSender: typeof transaction?.setSender === 'function',
  });

  // Ensure the transaction has the sender set
  const walletAddress = wallet.account?.address;
  if (!walletAddress) {
    throw new Error('Wallet address not available');
  }
  
  // CRITICAL: Set sender BEFORE any building attempts
  // The transaction builder needs the sender to query for coins
  if (transaction instanceof Transaction && typeof transaction.setSender === 'function') {
    try {
      transaction.setSender(walletAddress);
      console.log('[signAndExecuteTransaction] Set sender on transaction:', walletAddress);
    } catch (setSenderError: any) {
      console.warn('[signAndExecuteTransaction] Could not set sender:', setSenderError);
      // Don't throw - some transactions might already have sender set
    }
  } else {
    console.warn('[signAndExecuteTransaction] Transaction does not have setSender method');
  }

  // Try two approaches:
  // 1. First, try letting the wallet build the transaction (so it can select coins properly)
  // 2. If that fails, fall back to building it ourselves
  
  console.log('[signAndExecuteTransaction] Preparing transaction for wallet...', {
    transactionType: typeof transaction,
    isTransaction: transaction instanceof Transaction,
    transactionConstructor: transaction?.constructor?.name,
  });

  // First, verify WAL coins are accessible before attempting any transaction building
  const suiClient = new SuiClient({
    url: getFullnodeUrl(network),
  });
  
  const WAL_COIN_TYPE = '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';
  let walCoins: any[] = [];
  let walBalance = BigInt(0);
  
  try {
    // Check WAL balance and coin accessibility before building transaction
    const balance = await suiClient.getBalance({
      owner: walletAddress,
      coinType: WAL_COIN_TYPE,
    });
    walBalance = BigInt(balance.totalBalance);
    
    // Get coin objects to verify they're accessible
    // Note: getAllCoins doesn't accept coinType parameter, so we get all coins and filter
    const allCoins = await suiClient.getAllCoins({
      owner: walletAddress,
    });
    // Filter for WAL coins specifically
    walCoins = allCoins.data.filter(c => c.coinType === WAL_COIN_TYPE || c.coinType.includes('wal::WAL'));
    
    // Also try to get coin objects directly using getCoins if available
    // This might give us more detailed information about coin accessibility
    try {
      if (walCoins.length > 0) {
        // Get detailed coin object information
        const coinObjectIds = walCoins.map(c => c.coinObjectId);
        const coinObjects = await Promise.all(
          coinObjectIds.slice(0, 5).map(id => 
            suiClient.getObject({ id, options: { showContent: true } }).catch(() => null)
          )
        );
        const validCoins = coinObjects.filter(Boolean);
        console.log('[signAndExecuteTransaction] Coin object details:', {
          queried: coinObjectIds.length,
          valid: validCoins.length,
          coinStates: validCoins.map((co: any) => ({
            id: co?.data?.objectId,
            owner: co?.data?.owner,
            hasData: !!co?.data?.content,
          })),
        });
      }
    } catch (coinDetailError) {
      console.warn('[signAndExecuteTransaction] Could not get detailed coin info:', coinDetailError);
    }
    
    const requiredWALFormatted = estimatedCostMist 
      ? (Number(estimatedCostMist) / 1e9).toFixed(6)
      : 'unknown';
    
    console.log('[signAndExecuteTransaction] Pre-build coin check:', {
      walBalance: walBalance.toString(),
      walBalanceFormatted: (Number(walBalance) / 1e9).toFixed(6),
      requiredWAL: estimatedCostMist?.toString() || 'unknown',
      requiredWALFormatted: requiredWALFormatted,
      coinCount: walCoins.length,
      coinObjects: walCoins.map(c => ({
        id: c.coinObjectId,
        balance: c.balance,
        coinType: c.coinType,
        digest: c.digest,
      })),
      sufficient: estimatedCostMist ? Number(walBalance) >= estimatedCostMist : 'unknown',
      totalCoinsInWallet: allCoins.data.length,
      allCoinTypes: [...new Set(allCoins.data.map(c => c.coinType))].slice(0, 5),
    });
    
    if (walBalance === BigInt(0) || walCoins.length === 0) {
      throw new Error(
        `No WAL tokens found in wallet. ` +
        `Please ensure you have WAL tokens and they are unlocked. ` +
        `You can exchange SUI for WAL tokens using the Walrus CLI: 'walrus get-wal'`
      );
    }
  } catch (preCheckError: any) {
    console.error('[signAndExecuteTransaction] Pre-build coin check failed:', preCheckError);
    // If it's a balance error, throw it; otherwise continue and let the transaction builder handle it
    if (preCheckError?.message?.includes('No WAL tokens')) {
      throw preCheckError;
    }
  }

  try {
    // Approach 1: Try letting the wallet build the transaction
    // This allows the wallet to properly select WAL coin objects from the user's wallet
    // Some wallets need to build transactions themselves to handle coin selection correctly
    console.log('[signAndExecuteTransaction] Attempting to let wallet build transaction (for proper coin selection)...');
    
    try {
      // Ensure sender is set before passing to wallet
      if (transaction instanceof Transaction && typeof transaction.setSender === 'function') {
        transaction.setSender(walletAddress);
      }
      
      // Pass the Transaction object directly - let wallet handle building
      // This is important for WAL token selection as the wallet knows which coins are available
      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: transaction as any, // Pass Transaction object, not built bytes
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      console.log('[signAndExecuteTransaction] Wallet built and signed transaction successfully');
      
      if (!result?.digest) {
        throw new Error('Transaction did not return a digest');
      }
      
      return { digest: result.digest };
    } catch (walletBuildError: any) {
      // If wallet can't build Transaction object (e.g., "$Intent, $kind" error),
      // fall back to building it ourselves
      const errorMsg = walletBuildError?.message || String(walletBuildError);
      console.warn('[signAndExecuteTransaction] Wallet couldn\'t build Transaction object, trying pre-built approach...', {
        error: errorMsg,
        errorName: walletBuildError?.name,
        // Check if it's a coin selection error even in wallet build
        isCoinError: errorMsg.includes('Not enough coins') || errorMsg.includes('satisfy requested balance'),
      });
      
      // If wallet build failed due to coin selection, provide helpful error
      if (errorMsg.includes('Not enough coins') || errorMsg.includes('satisfy requested balance')) {
        const requiredInfo = estimatedCostMist 
          ? `Transaction requires ${(Number(estimatedCostMist) / 1e9).toFixed(6)} WAL, but wallet has ${(Number(walBalance) / 1e9).toFixed(6)} WAL. `
          : '';
        throw new Error(
          `Wallet couldn't select WAL tokens for transaction. ` +
          requiredInfo +
          `Wallet has ${walBalance.toString()} WAL tokens (${(Number(walBalance) / 1e9).toFixed(6)} WAL) across ${walCoins.length} coin object(s). ` +
          `Please ensure your WAL tokens are unlocked and accessible in your wallet. ` +
          `If the issue persists, try refreshing your wallet connection or splitting your WAL coins into smaller amounts.`
        );
      }
      
      // Approach 2: Build the transaction ourselves and pass built bytes
      // We already have coin data from the pre-check above
      
      // CRITICAL: Ensure the transaction has the sender set BEFORE building
      // The transaction builder needs the sender address to query for coins
      if (transaction instanceof Transaction && typeof transaction.setSender === 'function' && walletAddress) {
        try {
          transaction.setSender(walletAddress);
          console.log('[signAndExecuteTransaction] Set sender on transaction before building:', walletAddress);
        } catch (setSenderError: any) {
          console.warn('[signAndExecuteTransaction] Could not set sender:', setSenderError);
        }
      }

      // Use coin data from pre-check (already queried above)
      const requiredWALFormatted = estimatedCostMist 
        ? (Number(estimatedCostMist) / 1e9).toFixed(6)
        : 'unknown';
      console.log('[signAndExecuteTransaction] Using pre-checked coin data:', {
        walBalance: walBalance.toString(),
        walBalanceFormatted: (Number(walBalance) / 1e9).toFixed(6),
        requiredWAL: estimatedCostMist?.toString() || 'unknown',
        requiredWALFormatted: requiredWALFormatted,
        coinCount: walCoins.length,
        sufficient: estimatedCostMist ? Number(walBalance) >= estimatedCostMist : 'unknown',
      });

      // Build the transaction with explicit coin selection support
      // The build() method will query coins for the sender address
      // It needs the sender to be set to know which address to query coins for
      console.log('[signAndExecuteTransaction] Building transaction with sender:', walletAddress);
      console.log('[signAndExecuteTransaction] Available WAL balance:', {
        balance: walBalance.toString(),
        balanceFormatted: (Number(walBalance) / 1e9).toFixed(6),
        coinCount: walCoins.length,
        coins: walCoins.map(c => ({ 
          id: c.coinObjectId, 
          balance: c.balance,
          balanceFormatted: (Number(c.balance) / 1e9).toFixed(6),
          coinType: c.coinType,
        })),
        requiredWAL: estimatedCostMist?.toString() || 'unknown',
        requiredWALFormatted: estimatedCostMist ? (Number(estimatedCostMist) / 1e9).toFixed(6) : 'unknown',
      });
      
      // Verify coins are accessible one more time right before building
      if (walCoins.length === 0 && Number(walBalance) > 0) {
        console.warn('[signAndExecuteTransaction] WARNING: Balance shows WAL tokens but no coin objects found!');
        console.warn('[signAndExecuteTransaction] This might indicate coins are locked or in a different state.');
      }
      
      let builtTx: Uint8Array;
      try {
        // Try building with the client - it should automatically select coins
        // The transaction builder queries coins using the sender address
        // The Walrus SDK's transaction should handle WAL coin selection internally
        builtTx = await transaction.build({ 
          client: suiClient,
          // Ensure the sender is set so coin selection works
          // The build method will query coins for the sender
        });
        console.log('[signAndExecuteTransaction] Transaction built successfully, length:', builtTx.length);
      } catch (buildError: any) {
        // If build fails with coin selection error, provide more helpful error message
        const errorMsg = buildError?.message || String(buildError);
        console.error('[signAndExecuteTransaction] Transaction build failed:', {
          error: errorMsg,
          errorName: buildError?.name,
          hasWALCoins: walCoins.length > 0,
          walBalance: walBalance.toString(),
          walCoinCount: walCoins.length,
        });
        
        // Check if it's a coin selection issue
        if (errorMsg.includes('Not enough coins') || errorMsg.includes('satisfy requested balance')) {
          // The transaction builder couldn't select enough coins
          // This might be because:
          // 1. Coins are locked/frozen in the wallet
          // 2. The transaction requires more WAL than available
          // 3. Coin selection algorithm issue
          const requiredInfo = estimatedCostMist 
            ? `Transaction requires ${(Number(estimatedCostMist) / 1e9).toFixed(6)} WAL, but wallet has ${(Number(walBalance) / 1e9).toFixed(6)} WAL. `
            : '';
          throw new Error(
            `Failed to build transaction: Unable to select WAL tokens. ` +
            requiredInfo +
            `Wallet has ${walBalance.toString()} WAL tokens (${(Number(walBalance) / 1e9).toFixed(6)} WAL) across ${walCoins.length} coin object(s). ` +
            `Please ensure your WAL tokens are unlocked and accessible in your wallet. ` +
            `If the issue persists, try refreshing your wallet connection or splitting your WAL coins.`
          );
        }
        
        // Re-throw other errors with context
        throw new Error(
          `Failed to build transaction: ${errorMsg}. ` +
          `Wallet has ${walBalance.toString()} WAL tokens across ${walCoins.length} coin objects.`
        );
      }

      // Use the wallet adapter's signAndExecuteTransactionBlock method
      // Pass the built transaction (Uint8Array) to the wallet
      console.log('[signAndExecuteTransaction] Calling wallet.signAndExecuteTransactionBlock with pre-built transaction...');
      
      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: builtTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log('[signAndExecuteTransaction] Wallet returned result:', {
        hasDigest: !!result?.digest,
        digest: result?.digest,
      });

      if (!result?.digest) {
        throw new Error('Transaction did not return a digest');
      }

      return { digest: result.digest };
    }
  } catch (error: any) {
    console.error('[signAndExecuteTransaction] Error calling wallet:', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    throw error;
  }
}

/**
 * Create a Walrus client configured for testnet
 * Reference: https://sdk.mystenlabs.com/walrus
 */
export function createWalrusClient(network: 'testnet' | 'mainnet' = 'testnet') {
  // Create client exactly as per Walrus SDK documentation
  // Reference: https://sdk.mystenlabs.com/walrus
  // 
  // For Next.js browser environments, we may need WASM configuration
  // but for now we'll use the default configuration
  const client = new SuiJsonRpcClient({
    url: getFullnodeUrl(network),
    // Setting network on your client is required for walrus to work correctly
    network,
  }).$extend(
    walrus({
      // Optional: Add upload relay to reduce requests (~2200 -> fewer requests)
      // Uncomment to use upload relay (requires tip payment)
      // uploadRelay: {
      //   host: 'https://upload-relay.testnet.walrus.space',
      //   sendTip: {
      //     max: 1_000,
      //   },
      // },
      // Configure storage node client options for better error handling
      storageNodeClientOptions: {
        timeout: 60_000,
        onError: (error) => {
          // Log individual storage node errors for debugging
          // This helps troubleshoot when some nodes are down
          console.log('[Walrus] Storage node error:', error);
        },
      },
    })
  );

  console.log('[createWalrusClient] Created Walrus client:', {
    network,
    url: getFullnodeUrl(network),
    hasWalrus: typeof (client as any).walrus !== 'undefined',
  });

  return client;
}

/**
 * Store a blob on Walrus using user's wallet
 * Uses writeFilesFlow for browser environments with wallet popups
 * 
 * Supports multiple file types:
 * - Text: string or Uint8Array
 * - Images: File, Blob, or Uint8Array
 * - Videos: File, Blob, or Uint8Array
 * - Any binary data: File, Blob, or Uint8Array
 * 
 * Reference: https://sdk.mystenlabs.com/walrus
 * 
 * The flow:
 * 1. Encode the file and generate blobId
 * 2. Register the blob on-chain (user signs transaction)
 * 3. Upload the data to storage nodes
 * 4. Certify the blob on-chain (user signs transaction)
 * 5. Get the uploaded files
 * 
 * @param data - Data to store (string, Uint8Array, Blob, or File)
 * @param wallet - User's wallet (from useWallet() hook)
 * @param options - Storage options
 * @returns Promise with blob ID
 */
export async function storeBlobWithUserWallet(
  data: string | Uint8Array | Blob | File,
  wallet: WalletAdapter,
  options: {
    epochs?: number;
    deletable?: boolean;
    permanent?: boolean;
    network?: 'testnet' | 'mainnet';
    identifier?: string;
    tags?: Record<string, string>;
  } = {}
): Promise<{ blobId: string }> {
  if (!wallet || !wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  const network = options.network || 'testnet';
  const client = createWalrusClient(network);

  // Convert data to appropriate format for WalrusFile
  // WalrusFile.from() accepts: Uint8Array, Blob, or string
  let contents: Uint8Array | Blob;
  let fileSize: number;
  
  if (data instanceof File) {
    // File object - use as Blob (File extends Blob)
    contents = data;
    fileSize = data.size;
    // Auto-detect content type from File if not provided
    if (!options.tags && data.type) {
      options.tags = { 'content-type': data.type };
    }
    // Use filename as identifier if not provided
    if (!options.identifier && data.name) {
      options.identifier = data.name;
    }
  } else if (data instanceof Blob) {
    // Blob object
    contents = data;
    fileSize = data.size;
  } else if (typeof data === 'string') {
    // String - convert to Uint8Array
    contents = new TextEncoder().encode(data);
    fileSize = contents.length;
  } else {
    // Uint8Array
    contents = data;
    fileSize = data.length;
  }

  const epochs = options.epochs || 365;
  const deletable = options.deletable ?? !options.permanent;
  const walletAddress = wallet.account?.address || '';

  if (!walletAddress) {
    throw new Error('Cannot get wallet address - wallet not connected');
  }

  console.log('[storeBlobWithUserWallet] Using writeFilesFlow for browser wallet...', {
    blobSize: fileSize,
    epochs,
    deletable,
    network,
    address: walletAddress,
    identifier: options.identifier,
    contentType: options.tags?.['content-type'],
  });

  try {
    // Step 1: Create WalrusFile following the documentation pattern
    // Use meaningful identifier and optional tags
    const identifier = options.identifier || 'blob.bin';
    const file = WalrusFile.from({
      contents,
      identifier,
      ...(options.tags && { tags: options.tags }),
    });

    // Initialize the flow with files array
    // Note: Writing multiple files together is more efficient (single quilt)
    const flow = (client as any).walrus.writeFilesFlow({
      files: [file],
    });

    // Step 2: Encode the files and generate blobId
    // This can be done immediately when file is selected (per docs)
    await flow.encode();
    console.log('[storeBlobWithUserWallet] Files encoded successfully');

    // Step 3: Register the blob on-chain
    // Returns a Transaction object that needs to be signed by the user
    // Following the documentation pattern: flow.register({ epochs, owner, deletable })
    const registerTx = flow.register({
      epochs,
      owner: walletAddress,
      deletable,
    });

    if (!registerTx) {
      throw new Error('Register transaction is null or undefined');
    }

    // Calculate estimated cost for logging
    const costEstimate = estimateWalrusCost(fileSize, epochs);
    
    // Sign and execute the register transaction
    // This matches the docs pattern: signAndExecuteTransaction({ transaction: registerTx })
    console.log('[storeBlobWithUserWallet] Signing register transaction...', {
      epochs,
      deletable,
      owner: walletAddress,
      blobSize: fileSize,
      estimatedCost: costEstimate.estimatedCostWAL,
      estimatedCostMist: costEstimate.estimatedCostMist,
    });
    
    // Log transaction details before signing to help debug WAL token issues
    console.log('[storeBlobWithUserWallet] Register transaction details:', {
      transactionType: typeof registerTx,
      isTransaction: registerTx instanceof Transaction,
      hasBuild: typeof registerTx?.build === 'function',
      estimatedCost: costEstimate.estimatedCostWAL,
      estimatedCostMist: costEstimate.estimatedCostMist,
    });
    
    const registerResult = await signAndExecuteTransaction({
      transaction: registerTx,
      wallet,
      network,
      estimatedCostMist: costEstimate.estimatedCostMist,
    });
    
    console.log('[storeBlobWithUserWallet] Blob registered:', registerResult.digest);

    // Step 4: Upload the data to storage nodes
    // This can be done immediately after the register step
    // Per docs: await flow.upload({ digest })
    await flow.upload({ digest: registerResult.digest });
    console.log('[storeBlobWithUserWallet] Data uploaded to storage nodes');

    // Step 5: Certify the blob on-chain
    // Returns a Transaction object that needs to be signed by the user
    // Per docs: const certifyTx = flow.certify()
    const certifyTx = flow.certify();
    
    if (!certifyTx) {
      throw new Error('Certify transaction is null or undefined');
    }
    
    // Sign and execute the certify transaction
    // Per docs: await signAndExecuteTransaction({ transaction: certifyTx })
    // Certify transaction typically costs less than register, but we'll use the same estimate for logging
    console.log('[storeBlobWithUserWallet] Signing certify transaction...', {
      estimatedCost: costEstimate.estimatedCostWAL,
      estimatedCostMist: costEstimate.estimatedCostMist,
    });
    const certifyResult = await signAndExecuteTransaction({
      transaction: certifyTx,
      wallet,
      network,
      estimatedCostMist: costEstimate.estimatedCostMist, // Same estimate for logging
    });
    
    console.log('[storeBlobWithUserWallet] Blob certified:', certifyResult.digest);

    // Step 6: Get the uploaded files
    // Per docs: const files = await flow.listFiles()
    const files = await flow.listFiles();
    console.log('[storeBlobWithUserWallet] Files uploaded:', files);

    if (!files || files.length === 0 || !files[0]?.blobId) {
      throw new Error('No blob ID returned from writeFilesFlow');
    }

    return {
      blobId: files[0].blobId,
    };
  } catch (error: any) {
    console.error('[storeBlobWithUserWallet] SDK writeFilesFlow error:', {
      error,
      message: error?.message,
      stack: error?.stack,
    });
    
    const errorMessage = error?.message || String(error);
    const errorString = errorMessage.toLowerCase();
    
    if ((errorString.includes('insufficient') && errorString.includes('wal')) || 
        (errorString.includes('insufficient') && errorString.includes('balance') && errorString.includes('wal'))) {
      throw new Error(`Insufficient WAL balance: Your wallet needs WAL tokens to store on Walrus. Please exchange SUI for WAL tokens first.`);
    }
    
    if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
      throw new Error('Transaction was rejected by the user.');
    }
    
    throw error;
  }
}

/**
 * Read a blob from Walrus
 * 
 * @param blobId - Blob ID to read
 * @param network - Network (testnet or mainnet)
 * @returns Promise with blob data as Uint8Array
 */
export async function readBlobFromWalrus(
  blobId: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<Uint8Array> {
  const client = createWalrusClient(network);
  // The SDK extends the client with walrus methods
  return await (client as any).walrus.readBlob({ blobId });
}

/**
 * Store multiple files on Walrus using user's wallet
 * Writing multiple files together is more efficient (single quilt)
 * Uses writeFilesFlow for browser environments with wallet popups
 * 
 * Reference: https://sdk.mystenlabs.com/walrus
 * 
 * @param files - Array of file data with identifiers and optional tags
 * @param wallet - User's wallet (from useWallet() hook)
 * @param options - Storage options
 * @returns Promise with array of blob IDs
 */
export async function storeFilesWithUserWallet(
  files: Array<{
    contents: string | Uint8Array | Blob;
    identifier: string;
    tags?: Record<string, string>;
  }>,
  wallet: WalletAdapter,
  options: {
    epochs?: number;
    deletable?: boolean;
    permanent?: boolean;
    network?: 'testnet' | 'mainnet';
  } = {}
): Promise<{ blobIds: string[] }> {
  if (!wallet || !wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  if (!files || files.length === 0) {
    throw new Error('At least one file is required');
  }

  const network = options.network || 'testnet';
  const client = createWalrusClient(network);

  const epochs = options.epochs || 365;
  const deletable = options.deletable ?? !options.permanent;
  const walletAddress = wallet.account?.address || '';

  console.log('[storeFilesWithUserWallet] Using writeFilesFlow for multiple files...', {
    fileCount: files.length,
    epochs,
    deletable,
    network,
    address: walletAddress,
  });

  try {
    // Step 1: Create WalrusFile objects following the documentation pattern
    // Also calculate total file size for cost estimation
    let totalFileSize = 0;
    const walrusFiles = files.map((file) => {
      let contents: Uint8Array | Blob;
      
      if (file.contents instanceof Blob) {
        contents = file.contents;
        totalFileSize += file.contents.size;
      } else if (typeof file.contents === 'string') {
        contents = new TextEncoder().encode(file.contents);
        totalFileSize += contents.length;
      } else {
        contents = file.contents;
        totalFileSize += file.contents.length;
      }

      return WalrusFile.from({
        contents,
        identifier: file.identifier,
        ...(file.tags && { tags: file.tags }),
      });
    });

    // Calculate estimated cost for logging
    const costEstimate = estimateWalrusCost(totalFileSize, epochs);

    // Initialize the flow with multiple files
    // Writing multiple files together is more efficient (single quilt)
    const flow = (client as any).walrus.writeFilesFlow({
      files: walrusFiles,
    });

    // Step 2: Encode the files
    await flow.encode();
    console.log('[storeFilesWithUserWallet] Files encoded successfully', {
      totalFileSize,
      estimatedCost: costEstimate.estimatedCostWAL,
      estimatedCostMist: costEstimate.estimatedCostMist,
    });

    // Step 3: Register the blob
    const registerTx = flow.register({
      epochs,
      owner: walletAddress,
      deletable,
    });

    if (!registerTx) {
      throw new Error('Register transaction is null or undefined');
    }

    const registerResult = await signAndExecuteTransaction({
      transaction: registerTx,
      wallet,
      network,
      estimatedCostMist: costEstimate.estimatedCostMist,
    });
    
    console.log('[storeFilesWithUserWallet] Blob registered:', registerResult.digest);

    // Step 4: Upload the data to storage nodes
    await flow.upload({ digest: registerResult.digest });
    console.log('[storeFilesWithUserWallet] Data uploaded to storage nodes');

    // Step 5: Certify the blob
    const certifyTx = flow.certify();
    
    if (!certifyTx) {
      throw new Error('Certify transaction is null or undefined');
    }
    
    const certifyResult = await signAndExecuteTransaction({
      transaction: certifyTx,
      wallet,
      network,
      estimatedCostMist: costEstimate.estimatedCostMist, // Same estimate for logging
    });
    
    console.log('[storeFilesWithUserWallet] Blob certified:', certifyResult.digest);

    // Step 6: Get the uploaded files
    const uploadedFiles = await flow.listFiles();
    console.log('[storeFilesWithUserWallet] Files uploaded:', uploadedFiles);

    if (!uploadedFiles || uploadedFiles.length === 0) {
      throw new Error('No files returned from writeFilesFlow');
    }

    return {
      blobIds: uploadedFiles.map((f: any) => f.blobId).filter(Boolean) as string[],
    };
  } catch (error: any) {
    console.error('[storeFilesWithUserWallet] SDK writeFilesFlow error:', {
      error,
      message: error?.message,
      stack: error?.stack,
    });
    
    const errorMessage = error?.message || String(error);
    const errorString = errorMessage.toLowerCase();
    
    if ((errorString.includes('insufficient') && errorString.includes('wal')) || 
        (errorString.includes('insufficient') && errorString.includes('balance') && errorString.includes('wal'))) {
      throw new Error(`Insufficient WAL balance: Your wallet needs WAL tokens to store on Walrus. Please exchange SUI for WAL tokens first.`);
    }
    
    if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
      throw new Error('Transaction was rejected by the user.');
    }
    
    throw error;
  }
}

/**
 * Store a media file (image/video) on Walrus using user's wallet
 * Convenience function for uploading images and videos
 * 
 * @param file - File object from file input (image or video)
 * @param wallet - User's wallet (from useWallet() hook)
 * @param options - Storage options
 * @returns Promise with blob ID and file size
 */
export async function storeMediaFileWithUserWallet(
  file: File,
  wallet: WalletAdapter,
  options: {
    epochs?: number;
    deletable?: boolean;
    permanent?: boolean;
    network?: 'testnet' | 'mainnet';
  } = {}
): Promise<{ blobId: string; size: number }> {
  // File object automatically provides name and type
  const result = await storeBlobWithUserWallet(file, wallet, {
    ...options,
    permanent: options.permanent ?? true, // Media files are permanent by default
    epochs: options.epochs || 365,
    // identifier and content-type tags are auto-detected from File
  });

  return {
    blobId: result.blobId,
    size: file.size,
  };
}

/**
 * Store a contribution on Walrus using user's wallet
 * Wrapper around storeBlobWithUserWallet for contributions
 * 
 * @param contribution - Contribution object to store
 * @param wallet - User's wallet (from useWallet() hook)
 * @param options - Storage options
 * @returns Promise with blob ID
 */
export async function storeContributionWithUserWallet(
  contribution: Record<string, any>,
  wallet: WalletAdapter,
  options: {
    epochs?: number;
    deletable?: boolean;
    permanent?: boolean;
    network?: 'testnet' | 'mainnet';
  } = {}
): Promise<{ blobId: string }> {
  // Convert contribution to JSON string
  const data = JSON.stringify(contribution);
  
  // Use meaningful identifier and content-type tag
  return await storeBlobWithUserWallet(data, wallet, {
    ...options,
    permanent: options.permanent ?? true, // Contributions are permanent by default
    epochs: options.epochs || 365,
    identifier: 'contribution.json',
    tags: {
      'content-type': 'application/json',
    },
  });
}

/**
 * Create a step-by-step Walrus flow for browser environments
 * This allows separate user interactions for register and certify steps
 * to avoid browser popup blocking
 * 
 * Reference: https://sdk.mystenlabs.com/walrus
 * 
 * @param data - Data to store (string or Uint8Array)
 * @param wallet - User's wallet (from useWallet() hook)
 * @param options - Storage options
 * @returns Flow object with methods: encode(), register(), upload(), certify(), listFiles()
 */
export function createWalrusFlow(
  data: string | Uint8Array,
  wallet: WalletAdapter,
  options: {
    epochs?: number;
    deletable?: boolean;
    permanent?: boolean;
    network?: 'testnet' | 'mainnet';
  } = {}
) {
  if (!wallet || !wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  const network = options.network || 'testnet';
  const client = createWalrusClient(network);

  // Convert data to Uint8Array if string
  const blob = typeof data === 'string' 
    ? new TextEncoder().encode(data)
    : data;

  const epochs = options.epochs || 365;
  const deletable = options.deletable ?? !options.permanent;
  const walletAddress = wallet.account?.address || '';

  if (!walletAddress) {
    throw new Error('Cannot get wallet address - wallet not connected');
  }

  // Calculate estimated cost for logging and error messages
  const blobSize = blob.length;
  const costEstimate = estimateWalrusCost(blobSize, epochs);

  // Create WalrusFile and initialize the flow
  const file = WalrusFile.from({
    contents: blob,
    identifier: 'blob.bin',
  });

  const flow = (client as any).walrus.writeFilesFlow({
    files: [file],
  });

  return {
    // Step 1: Encode the files and generate blobId (can be done immediately)
    encode: async () => {
      await flow.encode();
      console.log('[createWalrusFlow] Files encoded successfully');
    },
    
    // Step 2: Register the blob on-chain (returns Transaction - user must click button to sign)
    register: () => {
      const registerTx = flow.register({
        epochs,
        owner: walletAddress,
        deletable,
      });

      if (!registerTx) {
        throw new Error('Register transaction is null or undefined');
      }

      // Set sender on transaction
      if (registerTx instanceof Transaction && typeof registerTx.setSender === 'function') {
        try {
          registerTx.setSender(walletAddress);
        } catch (setSenderError: any) {
          console.warn('[createWalrusFlow] Could not set sender:', setSenderError);
        }
      }

      return registerTx;
    },

    // Step 3: Upload the data to storage nodes (can be done after register)
    upload: async (digest: string) => {
      await flow.upload({ digest });
      console.log('[createWalrusFlow] Data uploaded to storage nodes');
    },

    // Step 4: Certify the blob on-chain (returns Transaction - user must click button to sign)
    certify: () => {
      const certifyTx = flow.certify();

      if (!certifyTx) {
        throw new Error('Certify transaction is null or undefined');
      }

      // Set sender on transaction
      if (certifyTx instanceof Transaction && typeof certifyTx.setSender === 'function') {
        try {
          certifyTx.setSender(walletAddress);
        } catch (setSenderError: any) {
          console.warn('[createWalrusFlow] Could not set sender:', setSenderError);
        }
      }

      return certifyTx;
    },

    // Step 5: Get the uploaded files
    listFiles: async () => {
      const files = await flow.listFiles();
      console.log('[createWalrusFlow] Files uploaded:', files);
      return files;
    },

    // Helper to sign and execute a transaction (used by register and certify)
    signAndExecute: async (transaction: Transaction) => {
      return await signAndExecuteTransaction({
        transaction,
        wallet,
        network,
        estimatedCostMist: costEstimate.estimatedCostMist,
      });
    },
  };
}

