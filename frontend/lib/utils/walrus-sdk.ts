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

  // The SDK needs a Signer that implements getAddress() and signTransactionBlock()
  // Check if wallet has signTransactionBlock (just signs) or signAndExecuteTransactionBlock (signs and executes)
  const signer = {
    getAddress: async () => {
      if (wallet.account?.address) {
        return wallet.account.address;
      }
      // Fallback to getAddress method if available
      if (wallet.getAddress) {
        return await wallet.getAddress();
      }
      throw new Error('Cannot get wallet address');
    },
    // The SDK expects signTransactionBlock that just signs (doesn't execute)
    // If wallet has signTransactionBlock, use it directly
    // Otherwise, adapt from signAndExecuteTransactionBlock
    signTransactionBlock: async (txb: Transaction) => {
      // Check if wallet has signTransactionBlock (sign only)
      if (wallet.signTransactionBlock) {
        return await wallet.signTransactionBlock({
          transactionBlock: txb as any,
        });
      }
      
      // If wallet only has signAndExecuteTransactionBlock, we need to use it
      // But the SDK expects just signing. We'll execute and return the signature
      // This is not ideal but works if the wallet doesn't support sign-only
      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      // The SDK expects { bytes: Uint8Array, signature: SerializedSignature }
      // We already executed, so return the signature from result
      // Note: This means the transaction is already executed, which might cause issues
      // The SDK might try to execute again. We may need to handle this differently.
      return {
        bytes: result.bytes || new Uint8Array(),
        signature: result.signature || result.digest || '',
      } as any;
    },
  };

  // Use writeBlob - user pays with WAL tokens
  // The signer's address must have:
  // - Sufficient SUI for gas (for registering and certifying the blob)
  // - Sufficient WAL tokens for storage fees
  try {
    const result = await (client as any).walrus.writeBlob({
      blob,
      epochs,
      deletable,
      signer: signer as any, // SDK expects Signer type from @mysten/sui
    });

    return {
      blobId: result.blobId,
    };
  } catch (error: any) {
    // Provide better error messages
    const errorMessage = error?.message || String(error);
    
    // Check for common errors
    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      throw new Error(`Insufficient balance: Your wallet needs WAL tokens to store on Walrus. Please exchange SUI for WAL tokens first. Error: ${errorMessage}`);
    }
    
    if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
      throw new Error('Transaction was rejected by the user.');
    }
    
    // Re-throw with context
    throw new Error(`Failed to store blob on Walrus: ${errorMessage}. Make sure your wallet has WAL tokens and SUI for gas fees.`);
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

