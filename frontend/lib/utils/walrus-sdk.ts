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

/**
 * Wallet adapter interface compatible with Suiet Wallet Kit
 * The wallet from useWallet() hook provides this interface
 */
export type WalletAdapter = {
  connected: boolean;
  account?: {
    address: string;
  };
  getAddress?: () => Promise<string>;
  signTransactionBlock?: (options: {
    transactionBlock: Transaction | any;
  }) => Promise<{
    bytes: Uint8Array;
    signature: string;
  }>;
  signAndExecuteTransactionBlock: (options: {
    transactionBlock: Transaction | any;
    options?: {
      showEffects?: boolean;
      showObjectChanges?: boolean;
    };
  }) => Promise<{
    digest: string;
    signature?: string;
    bytes?: Uint8Array;
    effects?: any;
    objectChanges?: any[];
  }>;
};

/**
 * Create a Walrus client configured for testnet
 * Reference: https://sdk.mystenlabs.com/walrus
 */
export function createWalrusClient(network: 'testnet' | 'mainnet' = 'testnet') {
  const client = new SuiJsonRpcClient({
    url: getFullnodeUrl(network),
    network,
  }).$extend(walrus());

  return client;
}

/**
 * Store a blob on Walrus using user's wallet
 * The user's wallet must have WAL tokens to pay for storage
 * 
 * Reference: https://sdk.mystenlabs.com/walrus
 * 
 * The SDK's writeBlob will:
 * 1. Register the blob on-chain (requires SUI for gas)
 * 2. Upload the blob to storage nodes
 * 3. Certify availability (requires SUI for gas)
 * 4. Pay for storage with WAL tokens from user's wallet
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

  // Get the wallet address synchronously (required by SDK)
  const walletAddress = wallet.account?.address || '';
  if (!walletAddress) {
    throw new Error('Cannot get wallet address - wallet not connected');
  }

  // Create a Sui client for transaction building/serialization
  const suiClient = new SuiClient({
    url: getFullnodeUrl(network),
  });

  // Create a Signer object - build transactions manually and pass them to wallet
  // This avoids the cloning issue by building transactions before passing them
  const signer = {
    toSuiAddress: () => walletAddress,
    
    signAndExecuteTransaction: async (txb: Transaction | any) => {
      // Build the transaction BEFORE passing to wallet adapter
      // This ensures it's in a format the wallet adapter can handle
      if (!txb) {
        throw new Error('Transaction object is null or undefined');
      }

      console.log('[storeBlobWithUserWallet] Building transaction...', {
        hasBuild: typeof txb.build === 'function',
        hasSetSender: typeof txb.setSender === 'function',
      });

      // Set sender if possible
      if (typeof txb.setSender === 'function') {
        try {
          txb.setSender(walletAddress);
        } catch (e) {
          // Sender might already be set
        }
      }

      // Build the transaction
      let transactionForWallet = txb;
      if (typeof txb.build === 'function') {
        try {
          transactionForWallet = await txb.build({ client: suiClient });
          console.log('[storeBlobWithUserWallet] Transaction built successfully');
        } catch (buildError: any) {
          console.error('[storeBlobWithUserWallet] Error building transaction:', buildError);
          // If build fails, try passing the original transaction
          transactionForWallet = txb;
        }
      }

      // Pass the built transaction to wallet adapter
      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: transactionForWallet as any,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      return {
        digest: result.digest,
        signature: result.signature,
        bytes: result.bytes,
        effects: result.effects,
        objectChanges: result.objectChanges,
      };
    },
  };

  try {
    console.log('[storeBlobWithUserWallet] Calling SDK writeBlob...', {
      blobSize: blob.length,
      epochs,
      deletable,
      network,
      address: walletAddress,
    });
    
    const result = await (client as any).walrus.writeBlob({
      blob,
      epochs,
      deletable,
      signer: signer as any,
    });

    console.log('[storeBlobWithUserWallet] SDK writeBlob success:', result);
    
    if (!result?.blobId) {
      throw new Error('SDK writeBlob returned no blobId. Response: ' + JSON.stringify(result));
    }

    return {
      blobId: result.blobId,
    };
  } catch (error: any) {
    console.error('[storeBlobWithUserWallet] SDK writeBlob error:', {
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

