/**
 * Frontend utilities for interacting with Walrus storage
 * These functions handle client-side operations before sending to backend
 * 
 * All operations go through the backend API which handles Walrus CLI interactions
 * Reference: https://docs.wal.app/usage/client-cli
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Response types for Walrus operations
 */
export interface StoredContribution {
  success: boolean;
  message?: string;
  contribution: {
    id?: string;
    ip_token_id: string;
    user_wallet: string;
    engagement_type: string;
    timestamp: number;
    walrus_cid?: string;
    walrus_blob_id?: string;
    blobId?: string;
    verified?: boolean;
    [key: string]: any;
  };
}

export interface Contribution {
  id: string;
  ip_token_id: string;
  user_wallet: string;
  engagement_type: string;
  timestamp: number;
  walrus_cid: string;
  walrus_blob_id?: string;
  verified: boolean;
  rating?: number;
  prediction?: string;
  review?: string;
  stake?: number;
  content_cid?: string;
  caption?: string;
  [key: string]: any;
}

export interface ContributionsResponse {
  success: boolean;
  ipTokenId: string;
  contributions: Contribution[];
}

export interface MetricsResponse {
  success: boolean;
  ipTokenId: string;
  metrics: {
    // User metrics (from Walrus)
    user_average_rating?: number;
    user_total_contributors?: number;
    user_total_engagements?: number;
    user_growth_rate?: number;
    user_viral_score?: number;
    user_prediction_accuracy?: number;
    
    // External metrics (from Nautilus)
    external_average_rating?: number;
    external_popularity_score?: number;
    external_member_count?: number;
    external_trending_score?: number;
    external_sources_count?: number;
    
    // Combined metrics (weighted average)
    combined_rating?: number;
    combined_popularity?: number;
    combined_growth_rate?: number;
    
    // Verification data
    nautilus_signatures?: Array<{
      source: string;
      signature: string;
      timestamp: number;
    }>;
    walrus_verified?: boolean;
    nautilus_verified?: boolean;
    
    // Legacy fields (for backward compatibility)
    average_rating?: number;
    total_contributors?: number;
    total_engagements?: number;
    prediction_accuracy?: number;
    growth_rate?: number;
    
    [key: string]: any;
  };
  sources?: {
    walrus?: {
      totalContributions?: number;
      verifiedContributions?: number;
      invalidContributions?: number;
    };
    nautilus?: {
      sourcesQueried?: number;
      sources?: string[];
    };
  };
}

export interface BlobStatus {
  success: boolean;
  blobId: string;
  certified: boolean;
  deletable: boolean;
  permanent: boolean;
  expiryEpoch?: number;
  endEpoch?: number;
  eventId?: string;
  objectId?: string;
}

/**
 * Store a contribution on Walrus via backend API
 * 
 * The backend will:
 * 1. Store the contribution on Walrus (permanent blob, 365 epochs)
 * 2. Index it by IP token ID
 * 3. Return the Walrus CID
 * 
 * @param contribution - Signed contribution object
 * @returns Promise with stored contribution including blob ID
 */
export async function storeContribution(contribution: Record<string, any>): Promise<StoredContribution> {
  const response = await fetch(`${API_BASE_URL}/api/oracle/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contribution),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to store contribution: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get contributions for an IP token
 * 
 * Queries the backend indexer which retrieves contributions from Walrus
 * 
 * @param ipTokenId - IP token ID
 * @param options - Query options
 * @returns Promise with contributions array
 */
export async function getContributions(
  ipTokenId: string,
  options?: {
    type?: string;
    startTime?: number;
    endTime?: number;
  }
): Promise<ContributionsResponse> {
  const params = new URLSearchParams();
  if (options?.type) params.append('type', options.type);
  if (options?.startTime) params.append('startTime', options.startTime.toString());
  if (options?.endTime) params.append('endTime', options.endTime.toString());

  const url = `${API_BASE_URL}/api/oracle/contributions/${ipTokenId}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch contributions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get aggregated metrics for an IP token
 * 
 * Returns combined metrics from Walrus (user contributions) and Nautilus (external truth)
 * 
 * @param ipTokenId - IP token ID
 * @param options - Query options
 * @param options.name - IP token name (required for Nautilus external data lookup)
 * @param options.includeExternal - Whether to include Nautilus external data (default: true)
 * @returns Promise with metrics object
 */
export async function getMetrics(
  ipTokenId: string,
  options?: {
    name?: string;
    includeExternal?: boolean;
  }
): Promise<MetricsResponse> {
  const params = new URLSearchParams();
  if (options?.name) params.append('name', options.name);
  if (options?.includeExternal !== undefined) {
    params.append('includeExternal', options.includeExternal.toString());
  }

  const url = `${API_BASE_URL}/api/oracle/metrics/${ipTokenId}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch metrics: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get blob status from Walrus
 * 
 * Checks if a blob is certified, deletable, and its expiry epoch
 * 
 * @param blobId - Walrus blob ID
 * @returns Promise with blob status
 */
export async function getBlobStatus(blobId: string): Promise<BlobStatus> {
  const response = await fetch(`${API_BASE_URL}/api/walrus/status/${blobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to get blob status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Read a blob directly from Walrus
 * 
 * Retrieves the raw blob data from Walrus storage
 * 
 * @param blobId - Walrus blob ID
 * @returns Promise with blob data (base64 encoded)
 */
export async function readBlob(blobId: string): Promise<{ success: boolean; blobId: string; data: string; size: number }> {
  const response = await fetch(`${API_BASE_URL}/api/walrus/read/${blobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to read blob: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Read a contribution by blob ID
 * 
 * Reads and parses a contribution stored on Walrus
 * 
 * @param blobId - Walrus blob ID
 * @returns Promise with contribution object
 */
export async function readContribution(blobId: string): Promise<{ success: boolean; contribution: Contribution }> {
  const response = await fetch(`${API_BASE_URL}/api/walrus/contribution/${blobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to read contribution: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Store raw data on Walrus
 * 
 * Stores arbitrary data on Walrus (not a contribution)
 * 
 * @param data - Data to store (string or Buffer)
 * @param options - Storage options
 * @returns Promise with blob information
 */
export async function storeBlob(
  data: string,
  options?: {
    deletable?: boolean;
    permanent?: boolean;
    epochs?: number;
  }
): Promise<{ success: boolean; blobId: string; size: number; deletable: boolean; permanent: boolean; epochs: number }> {
  const response = await fetch(`${API_BASE_URL}/api/walrus/store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data,
      deletable: options?.deletable || false,
      permanent: options?.permanent || !options?.deletable,
      epochs: options?.epochs || 365,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to store blob: ${response.statusText}`);
  }

  return response.json();
}

