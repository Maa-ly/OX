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
 * ⚠️ DEPRECATED: This function is deprecated. Use storeContributionWithUserWallet from walrus-sdk.ts instead.
 * Users should pay with WAL tokens from their own wallets using the TypeScript SDK.
 * 
 * This function is kept for backward compatibility but will be removed in a future version.
 * 
 * @deprecated Use storeContributionWithUserWallet from '@/lib/utils/walrus-sdk' instead
 * @param contribution - Signed contribution object
 * @returns Promise with stored contribution including blob ID
 */
export async function storeContribution(contribution: Record<string, any>): Promise<StoredContribution> {
  console.warn('⚠️ storeContribution is deprecated. Use storeContributionWithUserWallet from walrus-sdk.ts instead. Users should pay with WAL tokens from their wallets.');
  
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

/**
 * Post interface for Discover page
 */
export interface Post {
  id: string;
  blobId: string;
  author: string;
  authorAddress: string;
  content: string;
  mediaType: "image" | "video" | "text";
  mediaUrl?: string;
  mediaBlobId?: string; // Walrus blob ID for media
  ipTokenIds: string[]; // Array of IP token IDs this post is about
  likes: number;
  comments: number;
  timestamp: number | string; // Can be number (Unix timestamp) or string (formatted)
  tags: string[];
}

export interface StoredPost {
  success: boolean;
  post: Post;
  blobId: string;
}

/**
 * Upload media file to Walrus
 * 
 * @param file - File object to upload
 * @returns Promise with blob ID
 */
export async function uploadMediaToWalrus(file: File): Promise<{ blobId: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/posts/upload-media`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to upload media: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    blobId: result.blobId,
    size: result.size,
  };
}

/**
 * Store a post on Walrus via backend API
 * 
 * Posts are stored as JSON objects on Walrus with the following structure:
 * - content: text content
 * - mediaType: "image" | "video" | "text"
 * - mediaBlobId: Walrus blob ID for media (if applicable)
 * - ipTokenIds: array of IP token IDs
 * - author: author name/address
 * - authorAddress: wallet address
 * - timestamp: Unix timestamp
 * 
 * @param post - Post object to store
 * @param mediaFile - Optional file to upload to Walrus
 * @returns Promise with stored post including blob ID
 */
export async function storePost(
  post: Omit<Post, 'id' | 'blobId' | 'likes' | 'comments'>,
  mediaFile?: File
): Promise<StoredPost> {
  // First, upload media file to Walrus if provided
  let mediaBlobId: string | undefined;
  let mediaUrl: string | undefined;

  if (mediaFile) {
    try {
      const uploadResult = await uploadMediaToWalrus(mediaFile);
      mediaBlobId = uploadResult.blobId;
      // For now, we'll still store a preview URL. In production, you'd read from Walrus
      // For display, we can use the blob ID to fetch from Walrus
      mediaUrl = `${API_BASE_URL}/api/walrus/read/${mediaBlobId}`;
    } catch (error) {
      console.error('Failed to upload media to Walrus:', error);
      throw error;
    }
  } else if (post.mediaUrl) {
    // If mediaUrl is provided but no file, use it as-is
    mediaUrl = post.mediaUrl;
  }

  // Create post object for storage
  const postData = {
    content: post.content,
    mediaType: post.mediaType,
    mediaUrl: mediaUrl,
    mediaBlobId: mediaBlobId,
    ipTokenIds: post.ipTokenIds,
    author: post.author,
    authorAddress: post.authorAddress,
    timestamp: post.timestamp || Date.now(),
    tags: post.tags || [],
  };

  // Store post on Walrus via backend posts API
  const response = await fetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to store post: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Get all posts from Walrus
 * 
 * @param options - Query options
 * @returns Promise with posts array
 */
export async function getPosts(options?: {
  ipTokenId?: string;
  mediaType?: 'image' | 'video' | 'text';
  limit?: number;
  offset?: number;
}): Promise<{ posts: Post[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (options?.ipTokenId) params.append('ipTokenId', options.ipTokenId);
    if (options?.mediaType) params.append('mediaType', options.mediaType);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const url = `${API_BASE_URL}/api/posts${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to fetch posts: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      posts: data.posts || [],
      total: data.total || 0,
    };
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return { posts: [], total: 0 };
  }
}

/**
 * Like or unlike a post
 * 
 * @param blobId - Post blob ID
 * @param userAddress - User wallet address
 * @returns Promise with like status
 */
export async function likePost(blobId: string, userAddress: string): Promise<{ liked: boolean; likes: number }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${blobId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userAddress }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to like post: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add a comment to a post
 * 
 * @param blobId - Post blob ID
 * @param userAddress - User wallet address
 * @param content - Comment content
 * @param author - Optional author name
 * @returns Promise with comment data
 */
export async function commentOnPost(
  blobId: string,
  userAddress: string,
  content: string,
  author?: string
): Promise<{ comment: any; comments: number }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${blobId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userAddress, content, author }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to comment on post: ${response.statusText}`);
  }

  return response.json();
}

