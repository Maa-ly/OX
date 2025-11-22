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
}: {
  transaction: Transaction;
  wallet: WalletAdapter;
  network?: 'testnet' | 'mainnet';
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
  if (transaction instanceof Transaction && typeof transaction.setSender === 'function' && walletAddress) {
    try {
      transaction.setSender(walletAddress);
      console.log('[signAndExecuteTransaction] Set sender on transaction');
    } catch (setSenderError: any) {
      console.warn('[signAndExecuteTransaction] Could not set sender:', setSenderError);
    }
  }

  // Try two approaches:
  // 1. First, try letting the wallet build the transaction (so it can select coins properly)
  // 2. If that fails, fall back to building it ourselves
  
  console.log('[signAndExecuteTransaction] Preparing transaction for wallet...', {
    transactionType: typeof transaction,
    isTransaction: transaction instanceof Transaction,
    transactionConstructor: transaction?.constructor?.name,
  });

  try {
    // Approach 1: Try letting the wallet build the transaction
    // This allows the wallet to properly select WAL coin objects from the user's wallet
    // Some wallets need to build transactions themselves to handle coin selection correctly
    console.log('[signAndExecuteTransaction] Attempting to let wallet build transaction (for proper coin selection)...');
    
    try {
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
      console.warn('[signAndExecuteTransaction] Wallet couldn\'t build Transaction object, trying pre-built approach...', {
        error: walletBuildError?.message,
        errorName: walletBuildError?.name,
      });
      
      // Approach 2: Build the transaction ourselves and pass built bytes
      // Create a SuiClient to build the transaction
      const suiClient = new SuiClient({
        url: getFullnodeUrl(network),
      });

      // Build the transaction
      // Note: This might fail coin selection if the client can't find WAL coins
      // But it's worth trying as a fallback
      const builtTx = await transaction.build({ client: suiClient });
      console.log('[signAndExecuteTransaction] Transaction built successfully, length:', builtTx.length);

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

    // Sign and execute the register transaction
    // This matches the docs pattern: signAndExecuteTransaction({ transaction: registerTx })
    console.log('[storeBlobWithUserWallet] Signing register transaction...', {
      epochs,
      deletable,
      owner: walletAddress,
      blobSize: fileSize,
    });
    
    // Log transaction details before signing to help debug WAL token issues
    console.log('[storeBlobWithUserWallet] Register transaction details:', {
      transactionType: typeof registerTx,
      isTransaction: registerTx instanceof Transaction,
      hasBuild: typeof registerTx?.build === 'function',
    });
    
    const registerResult = await signAndExecuteTransaction({
      transaction: registerTx,
      wallet,
      network,
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
    console.log('[storeBlobWithUserWallet] Signing certify transaction...');
    const certifyResult = await signAndExecuteTransaction({
      transaction: certifyTx,
      wallet,
      network,
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
    const walrusFiles = files.map((file) => {
      let contents: Uint8Array | Blob;
      
      if (file.contents instanceof Blob) {
        contents = file.contents;
      } else if (typeof file.contents === 'string') {
        contents = new TextEncoder().encode(file.contents);
      } else {
        contents = file.contents;
      }

      return WalrusFile.from({
        contents,
        identifier: file.identifier,
        ...(file.tags && { tags: file.tags }),
      });
    });

    // Initialize the flow with multiple files
    // Writing multiple files together is more efficient (single quilt)
    const flow = (client as any).walrus.writeFilesFlow({
      files: walrusFiles,
    });

    // Step 2: Encode the files
    await flow.encode();
    console.log('[storeFilesWithUserWallet] Files encoded successfully');

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

