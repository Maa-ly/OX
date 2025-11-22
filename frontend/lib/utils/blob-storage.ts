/**
 * Local storage utility for managing user -> blob IDs mapping
 * Stores blob IDs per user address so we can fetch and display posts
 */

const STORAGE_KEY = 'walrus_user_blob_ids';

interface UserBlobMap {
  [userAddress: string]: string[]; // Array of blob IDs
}

/**
 * Get all blob IDs for a user
 */
export function getUserBlobIds(userAddress: string): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const map: UserBlobMap = JSON.parse(stored);
    return map[userAddress] || [];
  } catch (error) {
    console.error('[getUserBlobIds] Failed to read from localStorage:', error);
    return [];
  }
}

/**
 * Add a blob ID for a user
 */
export function addUserBlobId(userAddress: string, blobId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const map: UserBlobMap = stored ? JSON.parse(stored) : {};
    
    if (!map[userAddress]) {
      map[userAddress] = [];
    }
    
    // Avoid duplicates
    if (!map[userAddress].includes(blobId)) {
      map[userAddress].push(blobId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      console.log(`[addUserBlobId] Added blob ${blobId} for user ${userAddress}`);
    }
  } catch (error) {
    console.error('[addUserBlobId] Failed to write to localStorage:', error);
  }
}

/**
 * Add multiple blob IDs for a user
 */
export function addUserBlobIds(userAddress: string, blobIds: string[]): void {
  blobIds.forEach(blobId => addUserBlobId(userAddress, blobId));
}

/**
 * Get all blob IDs from all users
 */
export function getAllBlobIds(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const map: UserBlobMap = JSON.parse(stored);
    const allBlobIds: string[] = [];
    
    Object.values(map).forEach(blobIds => {
      allBlobIds.push(...blobIds);
    });
    
    return allBlobIds;
  } catch (error) {
    console.error('[getAllBlobIds] Failed to read from localStorage:', error);
    return [];
  }
}

/**
 * Get blob IDs for multiple users
 */
export function getBlobIdsForUsers(userAddresses: string[]): string[] {
  const allBlobIds: string[] = [];
  
  userAddresses.forEach(address => {
    const blobIds = getUserBlobIds(address);
    allBlobIds.push(...blobIds);
  });
  
  return allBlobIds;
}

/**
 * Remove a blob ID for a user (useful for cleanup)
 */
export function removeUserBlobId(userAddress: string, blobId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    const map: UserBlobMap = JSON.parse(stored);
    if (map[userAddress]) {
      map[userAddress] = map[userAddress].filter(id => id !== blobId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch (error) {
    console.error('[removeUserBlobId] Failed to write to localStorage:', error);
  }
}

/**
 * Clear all blob IDs for a user
 */
export function clearUserBlobIds(userAddress: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    const map: UserBlobMap = JSON.parse(stored);
    delete map[userAddress];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('[clearUserBlobIds] Failed to write to localStorage:', error);
  }
}

/**
 * Get the entire map (for debugging)
 */
export function getBlobMap(): UserBlobMap {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('[getBlobMap] Failed to read from localStorage:', error);
    return {};
  }
}

