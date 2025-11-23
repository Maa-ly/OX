/**
 * Frontend utilities for interacting with Walrus storage
 * These functions handle client-side operations before sending to backend
 * 
 * All operations go through the backend API which handles Walrus CLI interactions
 * Reference: https://docs.wal.app/usage/client-cli
 */

// Backend runs on port 3001 to avoid conflict with Next.js frontend (port 3000)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
 * Store a post on Walrus using user's wallet (TypeScript SDK)
 * 
 * Posts are stored as JSON objects on Walrus using the Mysten Labs TypeScript SDK.
 * Users pay with WAL tokens from their own wallets.
 * 
 * Posts structure:
 * - content: text content
 * - mediaType: "image" | "video" | "text"
 * - mediaBlobId: Walrus blob ID for media (if applicable)
 * - ipTokenIds: array of IP token IDs
 * - author: author name/address
 * - authorAddress: wallet address
 * - timestamp: Unix timestamp
 * 
 * @param post - Post object to store
 * @param options - Options including wallet and optional mediaFile
 * @returns Promise with stored post including blob ID
 */
export async function storePost(
  post: Omit<Post, 'id' | 'blobId' | 'likes' | 'comments'>,
  options?: {
    wallet?: any; // WalletAdapter from walrus-sdk.ts
    mediaFile?: File;
  }
): Promise<StoredPost> {
  // Import the SDK function
  const { storeContributionWithUserWallet, storeBlobWithUserWallet } = await import('./walrus-sdk');
  
  // Handle backward compatibility - if no options, throw error
  if (!options?.wallet) {
    throw new Error('Wallet is required. Please connect your wallet first and pass it as: storePost(post, { wallet, mediaFile })');
  }
  
  const { wallet, mediaFile } = options;
  
  if (!wallet || !wallet.connected || !wallet.account?.address) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  console.log('[storePost] Starting post storage with TypeScript SDK...', {
    hasWallet: !!wallet,
    walletAddress: wallet.account?.address,
    hasMediaFile: !!mediaFile,
    postContent: post.content?.substring(0, 50),
  });

  // First, upload media file to Walrus if provided (user pays with their wallet)
  let mediaBlobId: string | undefined;
  let mediaUrl: string | undefined;

  if (mediaFile) {
    try {
      console.log('[storePost] Uploading media file using SDK...', {
        fileName: mediaFile.name,
        fileSize: mediaFile.size,
        fileType: mediaFile.type,
      });
      
      // Use the new storeMediaFileWithUserWallet helper
      // This automatically handles File objects and detects content-type
      const { storeMediaFileWithUserWallet } = await import('./walrus-sdk');
      const uploadResult = await storeMediaFileWithUserWallet(mediaFile, wallet, {
        permanent: true,
        epochs: 365,
      });
      
      mediaBlobId = uploadResult.blobId;
      mediaUrl = `${API_BASE_URL}/api/walrus/read/${mediaBlobId}`;
      console.log('[storePost] Media uploaded successfully:', {
        blobId: mediaBlobId,
        size: uploadResult.size,
      });
    } catch (error: any) {
      console.error('[storePost] Error uploading media:', error);
      // Check if it's a balance error
      if (error.message?.includes('insufficient') || 
          error.message?.includes('WAL') ||
          error.message?.includes('balance')) {
        throw new Error('You need WAL tokens to store this media. Please get WAL tokens first (exchange SUI for WAL).');
      }
      throw error;
    }
  } else if (post.mediaUrl) {
    // If mediaUrl is provided but no file, use it as-is
    mediaUrl = post.mediaUrl;
  }

  // Create post object for storage
  const postData = {
    post_type: 'discover_post',
    engagement_type: 'post',
    content: post.content,
    mediaType: post.mediaType || 'text',
    mediaUrl: mediaUrl,
    mediaBlobId: mediaBlobId,
    ipTokenIds: post.ipTokenIds,
    author: post.author,
    authorAddress: post.authorAddress,
    timestamp: post.timestamp || Date.now(),
    tags: post.tags || [],
    likes: 0,
    comments: 0,
    likesList: [],
    commentsList: [],
  };

  // Store post on Walrus using user's wallet - USER PAYS with WAL tokens
  // Using Mysten Labs TypeScript SDK (@mysten/walrus)
  let blobId: string;
  try {
    console.log('[storePost] Storing post using TypeScript SDK...', {
      postType: postData.post_type,
      authorAddress: postData.authorAddress,
      hasMedia: !!mediaBlobId,
      contentLength: postData.content?.length,
      ipTokenIds: postData.ipTokenIds,
    });
    
    // Use Walrus TypeScript SDK - user pays with WAL tokens from their wallet
    const result = await storeContributionWithUserWallet(postData, wallet, {
      permanent: true,
      epochs: 365,
    });
    
    blobId = result.blobId;
    console.log('[storePost] Post stored successfully on Walrus:', blobId);
    
    // Store blob ID on-chain in the smart contract
    try {
      console.log('[storePost] Storing blob ID on-chain...', { blobId, hasText: !!post.content });
      const { storeBlob } = await import('./contract');
      await storeBlob(
        {
          blobId,
          text: post.content || undefined, // Include text if post has content
        },
        wallet
      );
      console.log('[storePost] Blob ID stored on-chain successfully');
    } catch (contractError: any) {
      console.error('[storePost] Error storing blob on-chain:', contractError);
      // Don't fail the entire upload if contract call fails - Walrus storage succeeded
      // The blob is still stored on Walrus, just not registered on-chain
    }
  } catch (walrusError: any) {
    console.error('[storePost] Error storing post on Walrus:', {
      error: walrusError,
      message: walrusError?.message,
      stack: walrusError?.stack,
      name: walrusError?.name,
      fullError: JSON.stringify(walrusError, Object.getOwnPropertyNames(walrusError)),
    });
    
    // Only check for specific balance errors (with WAL token mention)
    const errorMessage = walrusError?.message || String(walrusError);
    const errorLower = errorMessage.toLowerCase();
    
    // Only show WAL token error if it's specifically about WAL tokens
    if (errorLower.includes('insufficient') && (errorLower.includes('wal') || errorLower.includes('walrus token'))) {
      throw new Error('You need WAL tokens to store this post. Please get WAL tokens first (exchange SUI for WAL).');
    }
    
    // Re-throw the original error so we can see what it actually is
    // This will show the real error message from the SDK
    throw walrusError;
  }

  // Notify backend to index the post (backend doesn't store, just indexes)
  try {
    console.log('[storePost] Indexing post on backend...', { blobId });
    const response = await fetch(`${API_BASE_URL}/api/posts/index`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blobId,
        post: postData,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[storePost] Backend indexing failed:', error);
      throw new Error(error.error || 'Failed to index post');
    }

    const result = await response.json();
    console.log('[storePost] Post indexed successfully');
    return {
      success: true,
      post: {
        id: blobId,
        blobId,
        ...postData,
      },
      blobId,
    };
  } catch (indexError: any) {
    console.error('[storePost] Error indexing post:', indexError);
    // Post was stored but indexing failed - still return success since storage succeeded
    return {
      success: true,
      post: {
        id: blobId,
        blobId,
        ...postData,
      },
      blobId,
    };
  }
}

/**
 * Get all posts from Walrus
 * 
 * @param options - Query options
 * @returns Promise with posts array
 */
/**
 * Query Sui directly for blob IDs
 * Queries Sui events and blob objects to discover all blob IDs
 */
async function queryBlobIdsFromSui(): Promise<string[]> {
  try {
    const { suiClient } = await import('./sui');
    
    console.log('[queryBlobIdsFromSui] Querying Sui for blob IDs...');
    
    // Method 1: Query Sui events for Walrus blob creation
    try {
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: '0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af', // Walrus testnet
            module: 'walrus',
          },
        },
        limit: 500,
        order: 'descending',
      });

      const blobIds: string[] = [];
      const addresses = new Set<string>();

      for (const event of events.data) {
        // Extract blobId from event
        const parsedJson = event.parsedJson as any;
        const blobId = parsedJson?.blobId || 
                      parsedJson?.blob_id ||
                      parsedJson?.id ||
                      parsedJson?.blobObject?.blobId ||
                      parsedJson?.blobObject?.id;
        if (blobId) {
          blobIds.push(blobId);
        }

        // Extract addresses to query for blob objects
        const sender = event.sender || parsedJson?.sender || parsedJson?.owner;
        if (sender) {
          addresses.add(sender);
        }
      }

      console.log(`[queryBlobIdsFromSui] Found ${blobIds.length} blob IDs from events, ${addresses.size} addresses`);

      // Method 2: Query each address for their blob objects (with pagination - max 50 per page)
      for (const address of addresses) {
        try {
          const allObjects: any[] = [];
          let cursor: string | null = null;
          const pageLimit = 50; // Sui RPC max limit
          
          do {
            const response = await suiClient.getOwnedObjects({
              owner: address,
              options: {
                showType: true,
                showContent: true,
              },
              limit: pageLimit,
              cursor: cursor || undefined,
            });
            
            allObjects.push(...response.data);
            cursor = response.hasNextPage ? (response.nextCursor ?? null) : null;
          } while (cursor);

          for (const obj of allObjects) {
            const objType = obj.data?.type || '';
            if (objType.includes('walrus') && (objType.includes('BlobObject') || objType.includes('Blob'))) {
              const content = obj.data?.content;
              if (content && typeof content === 'object') {
                const blobId = (content as any).fields?.blobId || 
                              (content as any).blobId || 
                              (content as any).fields?.id ||
                              obj.data.objectId;
                if (blobId && !blobIds.includes(blobId)) {
                  blobIds.push(blobId);
                }
              } else if (obj.data.objectId && !blobIds.includes(obj.data.objectId)) {
                blobIds.push(obj.data.objectId);
              }
            }
          }
        } catch (err) {
          console.debug(`[queryBlobIdsFromSui] Error querying objects for ${address}:`, err);
        }
      }

      console.log(`[queryBlobIdsFromSui] Total unique blob IDs found: ${blobIds.length}`);
      return blobIds;
    } catch (error) {
      console.error('[queryBlobIdsFromSui] Error querying Sui:', error);
      return [];
    }
  } catch (error) {
    console.error('[queryBlobIdsFromSui] Failed to import Sui client:', error);
    return [];
  }
}

/**
 * Read a blob directly from Walrus aggregator
 * Can read by blobId or by objectId
 */
export async function readBlobFromWalrus(blobIdOrObjectId: string, isObjectId: boolean = false): Promise<any> {
  try {
    // Walrus aggregator URL for testnet
    const aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
    
    // According to Walrus docs, blobs can be read by object ID using /v1/blobs/by-object-id/<object-id>
    const endpoint = isObjectId 
      ? `${aggregatorUrl}/v1/blobs/by-object-id/${blobIdOrObjectId}`
      : `${aggregatorUrl}/v1/blobs/${blobIdOrObjectId}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to read blob: ${response.statusText}`);
    }

    const blobData = await response.text();
    try {
      return JSON.parse(blobData);
    } catch {
      // If not JSON, return as text
      return { content: blobData };
    }
  } catch (error) {
    console.debug(`[readBlobFromWalrus] Failed to read blob ${blobIdOrObjectId} (isObjectId: ${isObjectId}):`, error);
    throw error;
  }
}

export async function getPosts(options?: {
  ipTokenId?: string;
  mediaType?: 'image' | 'video' | 'text';
  limit?: number;
  offset?: number;
}): Promise<{ posts: Post[]; total: number }> {
  try {
    console.log('[getPosts] Querying Walrus directly (bypassing backend)...');
    
    // Step 1: Query Sui for blob IDs
    const blobIds = await queryBlobIdsFromSui();
    console.log(`[getPosts] Found ${blobIds.length} blob IDs from Sui`);

    // Step 2: Read each blob from Walrus aggregator
    const posts: Post[] = [];
    let readCount = 0;
    let errorCount = 0;

    for (const blobId of blobIds) {
      try {
        const blobData = await readBlobFromWalrus(blobId);
        
        // Check if it's a post (has post_type or engagement_type)
        if (blobData.post_type === 'discover_post' || 
            blobData.engagement_type === 'post' || 
            blobData.type === 'post') {
          
          // Filter by mediaType if specified
          if (options?.mediaType && blobData.mediaType !== options.mediaType) {
            continue;
          }

          // Filter by ipTokenId if specified
          if (options?.ipTokenId) {
            const ipTokenIds = blobData.ipTokenIds || [];
            if (!ipTokenIds.includes(options.ipTokenId)) {
              continue;
            }
          }

          posts.push({
            id: blobId,
            blobId,
            ...blobData,
            timestamp: blobData.timestamp || Date.now(),
          } as Post);
          readCount++;
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          console.debug(`[getPosts] Failed to read/blob ${blobId}:`, error);
        }
      }
    }

    // Sort by timestamp (newest first)
    posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Apply pagination
    const limit = options?.limit || 1000;
    const offset = options?.offset || 0;
    const paginatedPosts = posts.slice(offset, offset + limit);

    console.log(`[getPosts] Successfully read ${readCount} posts from Walrus (${errorCount} errors)`);
    console.log('[getPosts] Response:', { 
      total: posts.length,
      postsCount: paginatedPosts.length,
      hasPosts: paginatedPosts.length > 0,
    });

    return {
      posts: paginatedPosts,
      total: posts.length,
    };
  } catch (error: any) {
    console.error('[getPosts] Failed to fetch posts from Walrus:', {
      error,
      message: error?.message,
    });
    // Return empty array instead of throwing
    return {
      posts: [],
      total: 0,
    };
  }
}

/**
 * Get all posts by a specific wallet address
 * Queries Sui for blob objects owned by the address, then reads from Walrus
 * 
 * @param walletAddress - Wallet address to query
 * @returns Promise with posts array
 */
export async function getPostsByAddress(walletAddress: string): Promise<{ posts: Post[]; total: number }> {
  try {
    console.log(`[getPostsByAddress] Fetching posts for address: ${walletAddress}`);
    
    const { suiClient } = await import('./sui');
    
    // Query all objects owned by this address (with pagination - max 50 per page)
    const allObjects: any[] = [];
    let cursor: string | null = null;
    const pageLimit = 50; // Sui RPC max limit
    
    do {
      const response = await suiClient.getOwnedObjects({
        owner: walletAddress,
        options: {
          showType: true,
          showContent: true,
        },
        limit: pageLimit,
        cursor: cursor || undefined,
      });
      
      allObjects.push(...response.data);
      cursor = response.hasNextPage ? (response.nextCursor ?? null) : null;
      
      console.log(`[getPostsByAddress] Fetched ${response.data.length} objects (total: ${allObjects.length}, hasNext: ${!!cursor})`);
    } while (cursor);

    console.log(`[getPostsByAddress] Found ${allObjects.length} total objects for address`);

    // Store both objectId and blobId for each blob object
    // We'll try reading by objectId first (recommended by Walrus docs)
    interface BlobInfo {
      objectId: string;
      blobId?: string;
    }
    const blobInfos: BlobInfo[] = [];
    
    // Debug: Log all object types to see what we're getting
    console.log(`[getPostsByAddress] Inspecting ${allObjects.length} objects...`);
    const objectTypes = allObjects.slice(0, 5).map(obj => ({
      type: obj.data?.type || 'unknown',
      objectId: obj.data?.objectId,
      hasContent: !!obj.data?.content,
      contentType: obj.data?.content?.dataType || typeof obj.data?.content,
      contentFields: obj.data?.content && typeof obj.data.content === 'object' && 'fields' in obj.data.content
        ? Object.keys((obj.data.content as any).fields || {})
        : [],
    }));
    console.log('[getPostsByAddress] Sample object types:', objectTypes);
    
    // Filter for Walrus blob objects
    // Try multiple patterns - blob objects might have different type formats
    for (const obj of allObjects) {
      const objType = obj.data?.type || '';
      const objectId = obj.data?.objectId;
      
      // Check if it's a Walrus blob object
      // Walrus blob objects can have types like:
      // - '0x...::walrus::BlobObject' (standard Walrus)
      // - '0x...::blob::Blob' (alternative format)
      const isWalrusBlob = (objType.includes('walrus') && 
                           (objType.includes('BlobObject') || objType.includes('Blob'))) ||
                          (objType.includes('::blob::Blob') || objType.endsWith('::blob::Blob'));
      
      if (isWalrusBlob) {
        console.log(`[getPostsByAddress] Found Walrus blob object: ${objectId}, type: ${objType}`);
        const content = obj.data?.content;
        if (content && typeof content === 'object') {
          // Try multiple field names for blobId
          // For blob::Blob objects, the blobId might be in fields.blob_id or fields.id
          const fields = (content as any).fields || {};
          const blobId = fields.blobId || 
                        fields.blob_id ||
                        fields.id ||
                        (content as any).blobId || 
                        (content as any).blob_id ||
                        (content as any).id;
          
          console.log(`[getPostsByAddress] Extracted blobId: ${blobId} from object ${objectId}`, {
            fields: Object.keys(fields),
            blobId,
          });
          
          // Store both objectId and blobId - we'll try reading by objectId first
          blobInfos.push({
            objectId,
            blobId: blobId || undefined,
          });
        } else {
          // If no content structure, use objectId only
          console.log(`[getPostsByAddress] Using objectId only: ${objectId}`);
          blobInfos.push({
            objectId,
          });
        }
      }
    }

    console.log(`[getPostsByAddress] Found ${blobInfos.length} blob objects`);

    // Read each blob from Walrus aggregator
    // Try reading by objectId first (recommended by Walrus docs), then fallback to blobId
    const posts: Post[] = [];
    let readCount = 0;
    let errorCount = 0;

    for (const blobInfo of blobInfos) {
      try {
        let blobData: any = null;
        let readMethod = '';
        
        // Try reading by objectId first (recommended method per Walrus docs)
        try {
          blobData = await readBlobFromWalrus(blobInfo.objectId, true);
          readMethod = 'objectId';
          console.log(`[getPostsByAddress] Successfully read blob by objectId: ${blobInfo.objectId}`);
        } catch (objectIdError) {
          // If objectId fails and we have a blobId, try that
          if (blobInfo.blobId) {
            try {
              blobData = await readBlobFromWalrus(blobInfo.blobId, false);
              readMethod = 'blobId';
              console.log(`[getPostsByAddress] Successfully read blob by blobId: ${blobInfo.blobId}`);
            } catch (blobIdError) {
              throw new Error(`Both objectId and blobId failed: objectId=${objectIdError}, blobId=${blobIdError}`);
            }
          } else {
            throw objectIdError;
          }
        }
        
        // Check if it's a post
        if (blobData && (blobData.post_type === 'discover_post' || 
            blobData.engagement_type === 'post' || 
            blobData.type === 'post' ||
            blobData.content?.post_type === 'discover_post')) {
          
          // Parse content if it's a string
          let postData = blobData;
          if (typeof blobData.content === 'string') {
            try {
              postData = JSON.parse(blobData.content);
            } catch {
              // If parsing fails, use the content as-is
              postData = { content: blobData.content };
            }
          }
          
          posts.push({
            id: blobInfo.objectId,
            blobId: blobInfo.blobId || blobInfo.objectId,
            ...postData,
            timestamp: postData.timestamp || Date.now(),
          } as Post);
          readCount++;
        }
      } catch (error) {
        errorCount++;
        console.debug(`[getPostsByAddress] Failed to read blob objectId=${blobInfo.objectId}, blobId=${blobInfo.blobId}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    console.log(`[getPostsByAddress] Successfully read ${readCount} posts (${errorCount} errors)`);
    
    return {
      posts,
      total: posts.length,
    };
  } catch (error: any) {
    console.error('[getPostsByAddress] Failed to fetch posts:', {
      error,
      message: error?.message,
    });
    return {
      posts: [],
      total: 0,
    };
  }
}

/**
 * Like or unlike a post
 * 
 * @param blobId - Post blob ID
 * @param userAddress - User wallet address
 * @returns Promise with like status
 */
export async function likePost(blobId: string, userAddress: string): Promise<{ liked: boolean; likes: number; blobId?: string }> {
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
): Promise<{ comment: any; comments: number; blobId?: string }> {
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

