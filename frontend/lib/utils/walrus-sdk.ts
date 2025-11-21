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
  } as Signer;
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

  // Don't build the transaction - pass it directly to the wallet adapter
  // The wallet adapter should handle building it internally
  // Building it first might change the format in a way that breaks compatibility
  console.log('[signAndExecuteTransaction] Passing transaction directly to wallet (not building)...', {
    transactionType: typeof transaction,
    isTransaction: transaction instanceof Transaction,
    transactionConstructor: transaction?.constructor?.name,
  });

  try {
    // Use the wallet adapter's signAndExecuteTransactionBlock method
    // The parameter name is 'transactionBlock' for Suiet Wallet Kit
    // Pass the Transaction object directly - the wallet adapter should handle building it
    // This SHOULD trigger a wallet popup for the user to sign
    console.log('[signAndExecuteTransaction] Calling wallet.signAndExecuteTransactionBlock - wallet popup should appear now...');
    
    const result = await wallet.signAndExecuteTransactionBlock({
      transactionBlock: transaction as any,
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
      // uploadRelay: {
      //   host: 'https://upload-relay.testnet.walrus.space',
      //   sendTip: {
      //     max: 1_000,
      //   },
      // },
      // Optional: Configure storage node client options
      // storageNodeClientOptions: {
      //   timeout: 60_000,
      //   onError: (error) => console.log('[Walrus] Storage node error:', error),
      // },
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
 * Reference: https://sdk.mystenlabs.com/walrus
 * 
 * The flow:
 * 1. Encode the file and generate blobId
 * 2. Register the blob on-chain (user signs transaction)
 * 3. Upload the data to storage nodes
 * 4. Certify the blob on-chain (user signs transaction)
 * 5. Get the uploaded files
 * 
 * @param data - Data to store (string or Uint8Array)
 * @param wallet - User's wallet (from useWallet() hook)
 * @param options - Storage options
 * @returns Promise with blob ID
 */
export async function storeBlobWithUserWallet(
  data: string | Uint8Array,
  wallet: WalletAdapter,
  options: {
    epochs?: number;
    deletable?: boolean;
    permanent?: boolean;
    network?: 'testnet' | 'mainnet';
  } = {}
): Promise<{ blobId: string }> {
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

  console.log('[storeBlobWithUserWallet] Using writeFilesFlow for browser wallet...', {
    blobSize: blob.length,
    epochs,
    deletable,
    network,
    address: walletAddress,
  });

  try {
    // Step 1: Create WalrusFile and initialize the flow
    const file = WalrusFile.from({
      contents: blob,
    });

    const flow = (client as any).walrus.writeFilesFlow({
      files: [file],
    });

    // Step 2: Encode the files and generate blobId
    await flow.encode();
    console.log('[storeBlobWithUserWallet] Files encoded successfully');

    // Step 3: Register the blob on-chain
    // This returns a Transaction object that needs to be signed by the user
    const registerTx = flow.register({
      epochs,
      owner: walletAddress,
      deletable,
    });

    console.log('[storeBlobWithUserWallet] Register transaction created:', {
      type: typeof registerTx,
      isTransaction: registerTx instanceof Transaction,
      hasBuild: typeof registerTx?.build === 'function',
      hasSetSender: typeof registerTx?.setSender === 'function',
      keys: registerTx ? Object.keys(registerTx).slice(0, 30) : [],
      constructor: registerTx?.constructor?.name,
      // Log the actual transaction object to see its structure
      transactionValue: JSON.stringify(registerTx, (key, value) => {
        // Don't serialize functions or circular references
        if (typeof value === 'function') return '[Function]';
        if (key === '$Intent' || key === '$kind') return value; // Show these special properties
        return value;
      }, 2).substring(0, 500), // Limit length
    });
    
    // Check for special properties that might be causing issues
    if (registerTx && typeof registerTx === 'object') {
      const specialKeys = Object.keys(registerTx).filter(k => k.startsWith('$'));
      if (specialKeys.length > 0) {
        console.warn('[storeBlobWithUserWallet] Transaction has special properties:', specialKeys);
      }
    }
    
    // Ensure we have a valid transaction
    if (!registerTx) {
      throw new Error('Register transaction is null or undefined');
    }
    
    // The transaction from flow.register() should be a Transaction instance
    // According to Walrus SDK docs, flow.register() returns a Transaction that can be signed directly
    // Don't build it - pass it directly to the wallet adapter
    // Ensure the transaction has the sender set
    if (registerTx instanceof Transaction && typeof registerTx.setSender === 'function') {
      try {
        registerTx.setSender(walletAddress);
        console.log('[storeBlobWithUserWallet] Set sender on register transaction');
      } catch (setSenderError: any) {
        console.warn('[storeBlobWithUserWallet] Could not set sender:', setSenderError);
      }
    }
    
    // Sign and execute the register transaction
    // Use the helper function that matches the Walrus SDK docs pattern
    console.log('[storeBlobWithUserWallet] Signing register transaction...');
    console.log('[storeBlobWithUserWallet] Register transaction:', {
      type: typeof registerTx,
      isTransaction: registerTx instanceof Transaction,
      hasBuild: typeof registerTx?.build === 'function',
      hasSetSender: typeof registerTx?.setSender === 'function',
      constructor: registerTx?.constructor?.name,
    });
    
    let registerResult: { digest: string };
    try {
      // Use the helper function that matches Walrus SDK docs: signAndExecuteTransaction({ transaction: registerTx })
      registerResult = await signAndExecuteTransaction({
        transaction: registerTx,
        wallet,
        network,
      });
      
      console.log('[storeBlobWithUserWallet] Blob registered:', registerResult.digest);
    } catch (registerError: any) {
      console.error('[storeBlobWithUserWallet] Error signing register transaction:', {
        error: registerError,
        message: registerError?.message,
        stack: registerError?.stack,
      });
      throw registerError;
    }

    // Step 4: Upload the data to storage nodes
    await flow.upload({ digest: registerResult.digest });
    console.log('[storeBlobWithUserWallet] Data uploaded to storage nodes');

    // Step 5: Certify the blob on-chain
    // This returns a Transaction object that needs to be signed by the user
    const certifyTx = flow.certify();
    
    console.log('[storeBlobWithUserWallet] Certify transaction created:', {
      type: typeof certifyTx,
      isTransaction: certifyTx instanceof Transaction,
      hasBuild: typeof certifyTx?.build === 'function',
      hasSetSender: typeof certifyTx?.setSender === 'function',
      keys: certifyTx ? Object.keys(certifyTx).slice(0, 20) : [],
      constructor: certifyTx?.constructor?.name,
    });
    
    // Ensure certify transaction is valid
    if (!certifyTx) {
      throw new Error('Certify transaction is null or undefined');
    }
    
    // Ensure the certify transaction has the sender set
    if (certifyTx instanceof Transaction && typeof certifyTx.setSender === 'function') {
      try {
        certifyTx.setSender(walletAddress);
        console.log('[storeBlobWithUserWallet] Set sender on certify transaction');
      } catch (setSenderError: any) {
        console.warn('[storeBlobWithUserWallet] Could not set sender:', setSenderError);
      }
    }
    
    // Sign and execute the certify transaction
    // Use the helper function that matches the Walrus SDK docs pattern
    console.log('[storeBlobWithUserWallet] Signing certify transaction...');
    console.log('[storeBlobWithUserWallet] Certify transaction:', {
      type: typeof certifyTx,
      isTransaction: certifyTx instanceof Transaction,
      hasBuild: typeof certifyTx?.build === 'function',
      hasSetSender: typeof certifyTx?.setSender === 'function',
      constructor: certifyTx?.constructor?.name,
    });
    
    // Use the helper function that matches Walrus SDK docs: signAndExecuteTransaction({ transaction: certifyTx })
    const certifyResult = await signAndExecuteTransaction({
      transaction: certifyTx,
      wallet,
      network,
    });
    
    console.log('[storeBlobWithUserWallet] Blob certified:', certifyResult.digest);

    // Step 6: Get the uploaded files
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
  
  return await storeBlobWithUserWallet(data, wallet, {
    ...options,
    permanent: options.permanent ?? true, // Contributions are permanent by default
    epochs: options.epochs || 365,
  });
}

