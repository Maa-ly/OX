/**
 * Frontend utilities for direct smart contract interactions
 * These functions require wallet connection and user signatures
 * 
 * Uses Suiet Wallet Kit - import useWallet from '@suiet/wallet-kit' in your component
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { getSuiClient } from './sui';
import { 
  PACKAGE_ID, 
  TOKEN_REGISTRY_ID, 
  ADMIN_CAP_ID,
  MARKETPLACE_OBJECT_ID, 
  REWARDS_REGISTRY_ID, 
  ORACLE_OBJECT_ID,
  ORACLE_ADMIN_CAP_ID
} from './constants';

/**
 * Wallet interface for contract interactions
 * Compatible with Suiet Wallet Kit's useWallet() hook
 * 
 * Note: Using `any` for the wallet parameter to avoid type conflicts
 * between different versions of @mysten/sui packages
 */
export type WalletAdapter = any;

/**
 * Create an IP token (ADMIN ONLY - requires AdminCap)
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param params - Token creation parameters
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result and token ID
 */
export async function createIPToken(
  params: {
    name: string;
    symbol: string;
    description: string;
    category: number; // 0=anime, 1=manga, 2=manhwa
    reservePoolSize: number;
  },
  wallet: WalletAdapter
): Promise<{ digest: string; tokenId?: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const client = getSuiClient();
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::token::create_ip_token`,
    arguments: [
      tx.object(ADMIN_CAP_ID), // Requires AdminCap - only admin can create
      tx.object(TOKEN_REGISTRY_ID),
      tx.pure.string(params.name),
      tx.pure.string(params.symbol),
      tx.pure.string(params.description),
      tx.pure.u8(params.category),
      tx.pure.u64(BigInt(params.reservePoolSize)),
    ],
  });

  // Suiet Wallet Kit's signAndExecuteTransactionBlock signature
  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  // Extract created token ID from object changes
  const createdToken = result.objectChanges?.find(
    (change: any) => change.type === 'created' && change.objectType?.includes('IPToken')
  );

  return {
    digest: result.digest,
    tokenId: createdToken?.objectId,
  };
}

/**
 * Create a buy order for IP tokens
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param params - Buy order parameters
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result and order ID
 */
export async function createBuyOrder(
  params: {
    ipTokenId: string;
    price: number; // Scaled by 1e9
    quantity: number;
    paymentCoinId: string; // Coin object ID for payment
  },
  wallet: WalletAdapter
): Promise<{ digest: string; orderId?: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::marketplace::create_buy_order`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.pure.id(params.ipTokenId),
      tx.pure.u64(BigInt(params.price)),
      tx.pure.u64(BigInt(params.quantity)),
      tx.object(params.paymentCoinId),
    ],
  });

  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  const createdOrder = result.objectChanges?.find(
    (change: any) => change.type === 'created' && change.objectType?.includes('MarketOrder')
  );

  return {
    digest: result.digest,
    orderId: createdOrder?.objectId,
  };
}

/**
 * Create a sell order for IP tokens
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param params - Sell order parameters
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result and order ID
 */
export async function createSellOrder(
  params: {
    ipTokenId: string;
    price: number; // Scaled by 1e9
    quantity: number;
  },
  wallet: WalletAdapter
): Promise<{ digest: string; orderId?: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::marketplace::create_sell_order`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.pure.id(params.ipTokenId),
      tx.pure.u64(BigInt(params.price)),
      tx.pure.u64(BigInt(params.quantity)),
    ],
  });

  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  const createdOrder = result.objectChanges?.find(
    (change: any) => change.type === 'created' && change.objectType?.includes('MarketOrder')
  );

  return {
    digest: result.digest,
    orderId: createdOrder?.objectId,
  };
}

/**
 * Execute a buy order
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param orderId - Order ID to execute
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result
 */
export async function executeBuyOrder(
  orderId: string,
  wallet: WalletAdapter
): Promise<{ digest: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::marketplace::execute_buy_order`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(orderId),
    ],
  });

  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
    },
  });

  return {
    digest: result.digest,
  };
}

/**
 * Execute a sell order
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param orderId - Order ID to execute
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result
 */
export async function executeSellOrder(
  orderId: string,
  wallet: WalletAdapter
): Promise<{ digest: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::marketplace::execute_sell_order`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(orderId),
    ],
  });

  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
    },
  });

  return {
    digest: result.digest,
  };
}

/**
 * Cancel an order
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param orderId - Order ID to cancel
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result
 */
export async function cancelOrder(
  orderId: string,
  wallet: WalletAdapter
): Promise<{ digest: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::marketplace::cancel_order`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(orderId),
    ],
  });

  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
    },
  });

  return {
    digest: result.digest,
  };
}

/**
 * Initialize token price (ADMIN ONLY - requires OracleAdminCap)
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param params - Price initialization parameters
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result
 */
export async function initializeTokenPrice(
  params: {
    ipTokenId: string;
    basePrice: number; // Scaled by 1e9
  },
  wallet: WalletAdapter
): Promise<{ digest: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::oracle::initialize_token_price`,
    arguments: [
      tx.object(ORACLE_OBJECT_ID),
      tx.pure.id(params.ipTokenId),
      tx.pure.u64(BigInt(params.basePrice)),
    ],
  });

  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
    },
  });

  return {
    digest: result.digest,
  };
}

/**
 * Update engagement metrics (ADMIN ONLY - requires OracleAdminCap)
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param params - Metrics update parameters
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result
 */
export async function updateEngagementMetrics(
  params: {
    ipTokenId: string;
    averageRating: number; // Scaled by 100
    totalContributors: number;
    totalEngagements: number;
    predictionAccuracy: number; // 0-10000
    growthRate: number; // Scaled by 100
  },
  wallet: WalletAdapter
): Promise<{ digest: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::oracle::update_engagement_metrics`,
    arguments: [
      tx.object(ORACLE_OBJECT_ID),
      tx.object(ORACLE_ADMIN_CAP_ID),
      tx.pure.id(params.ipTokenId),
      tx.pure.u64(BigInt(params.averageRating)),
      tx.pure.u64(BigInt(params.totalContributors)),
      tx.pure.u64(BigInt(params.totalEngagements)),
      tx.pure.u64(BigInt(params.predictionAccuracy)),
      tx.pure.u64(BigInt(params.growthRate)),
    ],
  });

  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  return {
    digest: result.digest,
  };
}

/**
 * Recalculate price for an IP token (ADMIN ONLY - requires OracleAdminCap)
 * This will trigger a wallet popup for the user to sign the transaction
 * 
 * @param ipTokenId - IP token ID
 * @param wallet - Wallet adapter from useWallet() hook
 * @returns Promise with transaction result
 */
export async function recalculatePrice(
  ipTokenId: string,
  wallet: WalletAdapter
): Promise<{ digest: string }> {
  if (!wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::oracle::recalculate_price`,
    arguments: [
      tx.object(ORACLE_OBJECT_ID),
      tx.pure.id(ipTokenId),
    ],
  });

  const result = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any, // Type cast to avoid version conflicts
    options: {
      showEffects: true,
    },
  });

  return {
    digest: result.digest,
  };
}

