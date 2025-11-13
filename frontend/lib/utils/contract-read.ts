/**
 * Frontend utilities for reading from smart contracts (no wallet required)
 * These are read-only operations that don't require signatures
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getSuiClient } from './sui';
import { 
  PACKAGE_ID, 
  TOKEN_REGISTRY_ID, 
  ORACLE_OBJECT_ID,
  REWARDS_REGISTRY_ID
} from './constants';

/**
 * Get token information (read-only, no wallet required)
 * 
 * @param tokenId - IP token ID
 * @returns Promise with token information
 */
export async function getTokenInfo(tokenId: string): Promise<{
  name: string;
  symbol: string;
  totalSupply: number;
  reservePool: number;
  circulatingSupply: number;
}> {
  const client = getSuiClient();
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::token::get_token_info`,
    arguments: [tx.object(tokenId)],
  });

  const result = await client.devInspectTransactionBlock({
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    transactionBlock: tx,
  });

  if (result.results?.[0]?.returnValues) {
    const returnValues = result.results[0].returnValues;
    return {
      name: Buffer.from(returnValues[0][1], 'base64').toString(),
      symbol: Buffer.from(returnValues[1][1], 'base64').toString(),
      totalSupply: parseU64(returnValues[2][1]),
      reservePool: parseU64(returnValues[3][1]),
      circulatingSupply: parseU64(returnValues[4][1]),
    };
  }

  throw new Error('No return values from get_token_info');
}

/**
 * Get all token IDs from registry (read-only, no wallet required)
 * 
 * @returns Promise with array of token IDs
 */
export async function getAllTokenIds(): Promise<string[]> {
  const client = getSuiClient();
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::token::get_all_tokens`,
    arguments: [tx.object(TOKEN_REGISTRY_ID)],
  });

  const result = await client.devInspectTransactionBlock({
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    transactionBlock: tx,
  });

  if (result.results?.[0]?.returnValues) {
    const returnValue = result.results[0].returnValues[0];
    const vectorBytes = Buffer.from(returnValue[1], 'base64');
    
    try {
      const tokenIds: string[] = [];
      let offset = 0;
      
      // Read length (uleb128 encoding)
      let length = 0;
      let shift = 0;
      while (offset < vectorBytes.length) {
        const byte = vectorBytes[offset];
        length |= (byte & 0x7f) << shift;
        offset++;
        if ((byte & 0x80) === 0) break;
        shift += 7;
        if (shift > 32) break;
      }
      
      // Read each ID (32 bytes each)
      for (let i = 0; i < length && offset + 32 <= vectorBytes.length; i++) {
        const idBytes = vectorBytes.slice(offset, offset + 32);
        const idHex = '0x' + idBytes.toString('hex');
        tokenIds.push(idHex);
        offset += 32;
      }
      
      return tokenIds;
    } catch (parseError) {
      console.warn('Failed to parse token IDs vector:', parseError);
      return [];
    }
  }

  return [];
}

/**
 * Get token count (read-only, no wallet required)
 * 
 * @returns Promise with token count
 */
export async function getTokenCount(): Promise<number> {
  const client = getSuiClient();
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::token::get_token_count`,
    arguments: [tx.object(TOKEN_REGISTRY_ID)],
  });

  const result = await client.devInspectTransactionBlock({
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    transactionBlock: tx,
  });

  if (result.results?.[0]?.returnValues) {
    return parseU64(result.results[0].returnValues[0][1]);
  }

  return 0;
}

/**
 * Get price for an IP token (read-only, no wallet required)
 * 
 * @param ipTokenId - IP token ID
 * @returns Promise with price (scaled by 1e9) or null if not initialized
 */
export async function getTokenPrice(ipTokenId: string): Promise<number | null> {
  const client = getSuiClient();
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::oracle::get_price`,
    arguments: [
      tx.object(ORACLE_OBJECT_ID),
      tx.pure.id(ipTokenId),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    transactionBlock: tx,
  });

  if (result.results?.[0]?.returnValues) {
    const returnValue = result.results[0].returnValues[0];
    // Check if Option::some or Option::none
    // returnValue is [type, value] where type is 0 (none) or 1 (some)
    // TypeScript types this as [number | number[], string]
    const optionType = typeof returnValue[0] === 'number' ? returnValue[0] : (returnValue[0] as number[])[0];
    if (optionType === 0) {
      return null; // Option::none
    }
    // Option::some - parse u64
    const value = typeof returnValue[1] === 'string' ? returnValue[1] : (returnValue[1] as any);
    return parseU64(value);
  }

  return null;
}

/**
 * Get engagement metrics for an IP token (read-only, no wallet required)
 * 
 * @param ipTokenId - IP token ID
 * @returns Promise with engagement metrics or null
 */
export async function getEngagementMetrics(ipTokenId: string): Promise<any | null> {
  const client = getSuiClient();
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::oracle::get_engagement_metrics`,
    arguments: [
      tx.object(ORACLE_OBJECT_ID),
      tx.pure.id(ipTokenId),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    transactionBlock: tx,
  });

  if (result.results?.[0]?.returnValues) {
    const returnValue = result.results[0].returnValues[0];
    // Check if Option::some or Option::none
    // returnValue is [type, value] where type is 0 (none) or 1 (some)
    // TypeScript types this as [number | number[], string | any]
    const optionType = typeof returnValue[0] === 'number' ? returnValue[0] : (returnValue[0] as number[])[0];
    if (optionType === 0) {
      return null; // Option::none
    }
    // Option::some - return the value (would need proper parsing based on struct type)
    return returnValue[1];
  }

  return null;
}

/**
 * Get contributor record (read-only, no wallet required)
 * 
 * @param ipTokenId - IP token ID
 * @param userAddress - User wallet address
 * @returns Promise with contributor record or null
 */
export async function getContributor(
  ipTokenId: string,
  userAddress: string
): Promise<any | null> {
  const client = getSuiClient();
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::rewards::get_contributor`,
    arguments: [
      tx.object(REWARDS_REGISTRY_ID),
      tx.pure.id(ipTokenId),
      tx.pure.address(userAddress),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    transactionBlock: tx,
  });

  if (result.results?.[0]?.returnValues) {
    const returnValue = result.results[0].returnValues[0];
    // Check if Option::some or Option::none
    // returnValue is [type, value] where type is 0 (none) or 1 (some)
    const optionType = Array.isArray(returnValue[0]) ? returnValue[0][0] : returnValue[0];
    if (optionType === 0) {
      return null; // Option::none
    }
    // Option::some - return the value
    return Array.isArray(returnValue[1]) ? returnValue[1] : returnValue[1];
  }

  return null;
}

/**
 * Get contributor count (read-only, no wallet required)
 * 
 * @param ipTokenId - IP token ID
 * @returns Promise with contributor count
 */
export async function getContributorCount(ipTokenId: string): Promise<number> {
  const client = getSuiClient();
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::rewards::get_contributor_count`,
    arguments: [
      tx.object(REWARDS_REGISTRY_ID),
      tx.pure.id(ipTokenId),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    transactionBlock: tx,
  });

  if (result.results?.[0]?.returnValues) {
    return parseU64(result.results[0].returnValues[0][1]);
  }

  return 0;
}

/**
 * Parse u64 from base64 encoded value
 */
function parseU64(base64Value: string): number {
  try {
    const buffer = Buffer.from(base64Value, 'base64');
    // Sui uses little-endian u64
    let value = BigInt(0);
    for (let i = 0; i < 8; i++) {
      value |= BigInt(buffer[i]) << BigInt(i * 8);
    }
    return Number(value);
  } catch (error) {
    console.error('Error parsing u64:', error);
    return 0;
  }
}

