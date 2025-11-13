/**
 * Frontend utilities for Sui blockchain interactions
 * These functions handle client-side Sui operations
 */

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

/**
 * Get Sui client for the specified network
 * 
 * @param network - Network name ('testnet' | 'mainnet' | 'devnet')
 * @returns SuiClient instance
 */
export function getSuiClient(network: 'testnet' | 'mainnet' | 'devnet' = 'testnet'): SuiClient {
  return new SuiClient({ url: getFullnodeUrl(network) });
}

/**
 * Format Sui address for display
 * 
 * @param address - Sui address
 * @param length - Number of characters to show at start and end
 * @returns Formatted address string
 */
export function formatAddress(address: string, length: number = 4): string {
  if (!address) return '';
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Validate Sui address format
 * 
 * @param address - Address to validate
 * @returns True if valid Sui address format
 */
export function isValidSuiAddress(address: string): boolean {
  // Sui addresses are 32 bytes (64 hex characters) prefixed with 0x
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

