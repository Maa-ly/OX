/**
 * User Profile Utilities
 * Functions to fetch and manage user profiles
 */

export interface UserProfile {
  userAddress: string;
  username: string | null;
  profilePicture: string | null;
  displayName: string | null;
  bio: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get user profile by address or username
 */
export async function getUserProfile(identifier: string): Promise<UserProfile | null> {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${API_BASE}/api/user/profile/${identifier}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.profile) {
        return data.profile;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

/**
 * Get display name for a user (username or formatted address)
 */
export function getDisplayName(profile: UserProfile | null, address: string): string {
  if (profile?.username) {
    return profile.username;
  }
  if (profile?.displayName) {
    return profile.displayName;
  }
  // Format address: 0x6df2...9c71
  if (address && address.length > 10) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return 'Unknown';
}

/**
 * Get profile picture URL
 */
export function getProfilePictureUrl(profile: UserProfile | null): string | null {
  if (profile?.profilePicture) {
    return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${profile.profilePicture}`;
  }
  return null;
}

/**
 * Batch fetch profiles for multiple addresses
 */
export async function getProfilesForAddresses(addresses: string[]): Promise<Map<string, UserProfile>> {
  const profiles = new Map<string, UserProfile>();
  
  // Fetch profiles in parallel
  const promises = addresses.map(async (address) => {
    const profile = await getUserProfile(address);
    if (profile) {
      profiles.set(address, profile);
    }
  });
  
  await Promise.all(promises);
  return profiles;
}

