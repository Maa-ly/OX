/**
 * Utilities for checking WAL token balance and estimating transaction costs
 */

import { SuiClient } from '@mysten/sui/client';
import { getFullnodeUrl } from '@mysten/sui/client';

// WAL token type on testnet
const WAL_TOKEN_TYPE = '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';

export interface BalanceInfo {
  walBalance: number; // In MIST (smallest unit)
  walBalanceFormatted: string; // Formatted as WAL (e.g., "1.5 WAL")
  suiBalance: number; // In MIST
  suiBalanceFormatted: string; // Formatted as SUI
  hasWAL: boolean;
  walletAddress: string;
}

/**
 * Check WAL token balance for a wallet address
 * 
 * @param walletAddress - Wallet address to check
 * @param network - Network (testnet or mainnet)
 * @returns Promise with balance information
 */
export async function checkWALBalance(
  walletAddress: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<BalanceInfo> {
  const client = new SuiClient({
    url: getFullnodeUrl(network),
  });

  try {
    // Get WAL token balance
    const walBalance = await client.getBalance({
      owner: walletAddress,
      coinType: WAL_TOKEN_TYPE,
    });

    // Get SUI balance
    const suiBalance = await client.getBalance({
      owner: walletAddress,
    });

    const walBalanceMist = BigInt(walBalance.totalBalance || '0');
    const suiBalanceMist = BigInt(suiBalance.totalBalance || '0');

    return {
      walBalance: Number(walBalanceMist),
      walBalanceFormatted: formatBalance(Number(walBalanceMist), 'WAL'),
      suiBalance: Number(suiBalanceMist),
      suiBalanceFormatted: formatBalance(Number(suiBalanceMist), 'SUI'),
      hasWAL: Number(walBalanceMist) > 0,
      walletAddress,
    };
  } catch (error: any) {
    console.error('[checkWALBalance] Error checking balance:', error);
    // If WAL token type doesn't exist or wallet has no WAL, return zero balance
    if (error.message?.includes('not found') || error.message?.includes('No coins')) {
      const suiBalance = await client.getBalance({
        owner: walletAddress,
      });
      const suiBalanceMist = BigInt(suiBalance.totalBalance || '0');
      
      return {
        walBalance: 0,
        walBalanceFormatted: '0 WAL',
        suiBalance: Number(suiBalanceMist),
        suiBalanceFormatted: formatBalance(Number(suiBalanceMist), 'SUI'),
        hasWAL: false,
        walletAddress,
      };
    }
    throw error;
  }
}

/**
 * Format balance from MIST to readable format
 * 
 * @param balanceMist - Balance in MIST (smallest unit)
 * @param symbol - Token symbol (WAL or SUI)
 * @returns Formatted balance string
 */
function formatBalance(balanceMist: number, symbol: 'WAL' | 'SUI'): string {
  const balance = balanceMist / 1e9;
  if (balance === 0) return `0 ${symbol}`;
  if (balance < 0.0001) return `<0.0001 ${symbol}`;
  if (balance < 1) return `${balance.toFixed(4)} ${symbol}`;
  if (balance < 1000) return `${balance.toFixed(2)} ${symbol}`;
  return `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`;
}

/**
 * Estimate the cost of storing a blob on Walrus
 * 
 * Cost factors:
 * - Blob size (larger blobs cost more)
 * - Number of epochs (longer storage costs more)
 * - Current network conditions
 * 
 * This is a rough estimate. Actual costs may vary.
 * 
 * @param blobSizeBytes - Size of the blob in bytes
 * @param epochs - Number of epochs to store (default: 365)
 * @returns Estimated cost in WAL (as MIST)
 */
export function estimateWalrusCost(
  blobSizeBytes: number,
  epochs: number = 365
): {
  estimatedCostMist: number;
  estimatedCostWAL: string;
  breakdown: {
    baseCost: number;
    sizeCost: number;
    epochCost: number;
  };
} {
  // Rough cost estimation based on Walrus documentation
  // Base cost: ~0.001 WAL (1,000,000 MIST)
  const baseCostMist = 1_000_000;
  
  // Size cost: ~0.01 WAL per MB (10,000,000 MIST per MB)
  const sizeCostPerMB = 10_000_000;
  const blobSizeMB = blobSizeBytes / (1024 * 1024);
  const sizeCostMist = Math.ceil(blobSizeMB * sizeCostPerMB);
  
  // Epoch cost: minimal for longer storage, but scales slightly
  // For simplicity, we'll use a small multiplier
  const epochMultiplier = 1 + (epochs / 365) * 0.1; // 10% increase per year
  
  const totalCostMist = Math.ceil((baseCostMist + sizeCostMist) * epochMultiplier);
  
  return {
    estimatedCostMist: totalCostMist,
    estimatedCostWAL: formatBalance(totalCostMist, 'WAL'),
    breakdown: {
      baseCost: baseCostMist,
      sizeCost: sizeCostMist,
      epochCost: Math.ceil((baseCostMist + sizeCostMist) * (epochMultiplier - 1)),
    },
  };
}

/**
 * Check if wallet has sufficient WAL balance for a transaction
 * 
 * @param balanceInfo - Current balance information
 * @param requiredCostMist - Required cost in MIST
 * @returns Object with sufficient flag and details
 */
export function checkSufficientBalance(
  balanceInfo: BalanceInfo,
  requiredCostMist: number
): {
  sufficient: boolean;
  currentBalance: number;
  requiredBalance: number;
  shortfall: number;
  shortfallFormatted: string;
} {
  const sufficient = balanceInfo.walBalance >= requiredCostMist;
  const shortfall = sufficient ? 0 : requiredCostMist - balanceInfo.walBalance;

  return {
    sufficient,
    currentBalance: balanceInfo.walBalance,
    requiredBalance: requiredCostMist,
    shortfall,
    shortfallFormatted: formatBalance(shortfall, 'WAL'),
  };
}

