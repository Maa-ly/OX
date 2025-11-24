import express from 'express';
import multer from 'multer';
import { logger } from '../utils/logger.js';
import { WalrusService } from '../services/walrus.js';
import { WalrusIndexerService, getIndexerService } from '../services/walrus-indexer.js';
import { ContractService } from '../services/contract.js';
// Blob storage is now handled on-chain via smart contract

const router = express.Router();
const walrusService = new WalrusService();
const indexerService = getIndexerService(); // Use singleton instance
const contractService = new ContractService();

// Export indexerService so walrus.js can use the same instance
export { indexerService };

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

/**
 * Index a post that was already stored on Walrus by the user
 * Users now store directly using the Walrus SDK and pay with their own WAL tokens
 * POST /api/posts/index
 */
router.post('/index', async (req, res, next) => {
  try {
    const { blobId, post, walrusResponse } = req.body;

    if (!blobId) {
      return res.status(400).json({
        success: false,
        error: 'blobId is required',
      });
    }

    // Always index under "all" so everyone can see it, plus any specific IP token IDs
    const specificIpTokenIds = post?.ipTokenIds && Array.isArray(post.ipTokenIds) && post.ipTokenIds.length > 0
      ? post.ipTokenIds
      : [];
    
    // Always include 'all' so posts are visible to everyone
    const ipTokenIds = ['all', ...specificIpTokenIds];

    logger.info(`Indexing post for IP tokens: ${ipTokenIds.join(', ')}, blobId: ${blobId}`);
    // Note: Blob storage is now handled on-chain via smart contract (storeBlob function)
    // The contract stores: address -> blobId + text mapping

    logger.info(`Post uploaded to Walrus: ${blobId}`, {
      hasFullResponse: !!walrusResponse,
      objectId: walrusResponse?.newlyCreated?.blobObject?.id,
      authorAddress: post?.authorAddress,
    });

    // Ensure post metadata includes likes/comments structure
    // CRITICAL: originalBlobId should point to the media/blobId if media exists, otherwise the post/blobId
    const originalBlobId = post?.mediaBlobId || blobId; // Use media/blobId as original if media exists
    
    const postMetadata = {
      post_type: 'discover_post',
      engagement_type: 'post',
      mediaType: post?.mediaType || 'text',
      timestamp: post?.timestamp || Date.now(),
      authorAddress: post?.authorAddress,
      author: post?.author,
      content: post?.content || '',
      mediaUrl: post?.mediaUrl,
      mediaBlobId: post?.mediaBlobId,
      ipTokenIds: post?.ipTokenIds || [],
      tags: post?.tags || [],
      likes: post?.likes ?? 0,
      comments: post?.comments ?? 0,
      likesList: post?.likesList || [],
      commentsList: post?.commentsList || [],
      // Reference to the original blob (media/blobId for media posts, post/blobId for text posts)
      // This is what the search uses to find the post when given a media/blobId
      // CRITICAL: For media posts, this should be the mediaBlobId so likes/comments can find the post
      originalBlobId: originalBlobId,
      // Also store the post/blobId for reference
      postBlobId: blobId,
    };

    // Store the full post metadata on Walrus so likes/comments can be tracked
    // This creates a metadata blob that includes all post info + engagement data
    // Use HTTP API method (same as uploads) instead of storeContribution
    let metadataBlobId = blobId;
    try {
      const jsonData = JSON.stringify(postMetadata, null, 2);
      // Use backend wallet from ADMIN_PRIVATE_KEY to fund metadata blob creation
      const storedMetadata = await walrusService.storeBlob(jsonData, {
        permanent: true,
        epochs: 365,
        // Use backend wallet address from ADMIN_PRIVATE_KEY - this wallet funds the operation
        userAddress: walrusService.walletAddress, // Backend wallet pays for storing metadata
      });
      metadataBlobId = storedMetadata.blobId || blobId;
      logger.info(`Stored post metadata on Walrus via HTTP API: ${metadataBlobId} (original blob: ${blobId}, funded by wallet: ${walrusService.walletAddress})`);
    } catch (metadataError) {
      logger.warn(`Failed to store post metadata on Walrus via HTTP API, using original blobId:`, {
        error: metadataError?.message,
        blobId,
      });
      // Continue with original blobId if metadata storage fails
    }

    // Index the post for each IP token using the metadata blobId
    // This makes the post visible to everyone when they query posts
    for (const ipTokenId of ipTokenIds) {
      try {
        await indexerService.indexContribution(
          ipTokenId,
          metadataBlobId, // Use metadata blobId instead of original blobId
          postMetadata
        );
        logger.info(`Indexed post ${metadataBlobId} for token ${ipTokenId}`);
      } catch (indexError) {
        // Log but don't fail - post is still stored on Walrus
        logger.warn(`Failed to index post ${metadataBlobId} for token ${ipTokenId}:`, {
          error: indexError?.message,
          stack: indexError?.stack,
        });
      }
    }

    // Log index state for debugging
    logger.info(`Post indexed successfully. In-memory index now has posts for: ${ipTokenIds.join(', ')}`);

    res.json({
      success: true,
      blobId: metadataBlobId, // Return metadata blobId (includes likes/comments structure)
      originalBlobId: blobId, // Also return original blobId for reference
      indexed: true,
      ipTokenIds,
      post: {
        ...postMetadata,
        walrus_blob_id: metadataBlobId,
        walrus_cid: metadataBlobId,
        blobId: metadataBlobId,
        id: metadataBlobId,
        originalBlobId: blobId,
      },
    });
  } catch (error) {
    logger.error('Error indexing post:', {
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      blobId: req.body?.blobId,
    });
    
    // Return a proper error response instead of using next(error) to avoid 500
    res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Failed to index post',
        type: error?.name || 'UnknownError',
        code: error?.code,
      },
    });
  }
});

/**
 * Store a new post (LEGACY - kept for backward compatibility)
 * POST /api/posts
 * 
 * NOTE: This endpoint is deprecated and disabled.
 * Frontend MUST use Walrus TypeScript SDK directly via storePost() function.
 * Users must store posts using the SDK and pay with WAL tokens from their own wallets.
 * 
 * This endpoint now only redirects to /api/posts/index if a blobId is provided.
 */
router.post('/', async (req, res, next) => {
  try {
    // If blobId is provided, treat as index request (legacy compatibility)
    if (req.body.blobId) {
      logger.info('Legacy /api/posts called with blobId, redirecting to /index');
      // Forward to index endpoint
      req.url = '/index';
      return router.handle(req, res, next);
    }
    
    // Otherwise, return error - frontend must use TypeScript SDK
    logger.warn(`Deprecated: /api/posts endpoint called without blobId. Frontend must use Walrus TypeScript SDK.`);
    
    return res.status(400).json({
      success: false,
      error: 'Backend storage is disabled. Please use the Walrus TypeScript SDK on the frontend to store posts. Users must pay with WAL tokens from their own wallets.',
      details: 'Use storePost() from @/lib/utils/walrus with wallet parameter in the frontend. This function uses the Mysten Labs TypeScript SDK (@mysten/walrus) and stores posts directly on Walrus. After storing, it automatically calls /api/posts/index to index the post.',
      fix: 'The frontend should call: storePost(postData, { wallet, mediaFile }). The storePost function uses the TypeScript SDK to store directly on Walrus, then calls /api/posts/index with the blobId.',
    });
  } catch (error) {
    logger.error('Error in deprecated /api/posts endpoint:', error);
    next(error);
  }
});

/**
 * Get all posts with IP token associations for oracle metrics
 * GET /api/posts/oracle-metrics
 * 
 * Returns all posts with their associated IP tokens for oracle aggregation
 * This endpoint is specifically designed for the oracle to track post activities
 */
router.get('/oracle-metrics', async (req, res, next) => {
  try {
    logger.info('Fetching all posts for oracle metrics');

    // Get posts from smart contract (blob storage)
    let allPosts = [];
    try {
      // Fetch all blobs from the contract
      const { contractService } = await import('../services/contract.js');
      const contractBlobs = await contractService.getAllBlobs();
      logger.info(`Found ${contractBlobs.length} blobs from contract`);
      
      // Read each blob from Walrus
      for (const blob of contractBlobs) {
        try {
          const contribution = await walrusService.readContribution(blob.blobId);
          if (contribution.post_type === 'discover_post' || contribution.engagement_type === 'post') {
            // Override content with contract text if available
            if (blob.text) {
              contribution.content = blob.text;
            }
            // Override timestamp with contract timestamp if available
            if (blob.timestamp) {
              contribution.timestamp = blob.timestamp;
            }
            allPosts.push(contribution);
          }
        } catch (readError) {
          logger.debug(`Failed to read blob ${blob.blobId}:`, readError);
        }
      }
      
      logger.info(`Found ${allPosts.length} posts from contract blobs`);
    } catch (error) {
      logger.warn('Error reading from contract, falling back to Sui query:', error);
      // Fallback: Query Walrus/Sui directly
      allPosts = await walrusService.getAllPosts({});
      logger.info(`Found ${allPosts.length} total posts from Walrus/Sui fallback`);
    }

    // Format posts for oracle with IP token associations
    const postsWithIpTokens = allPosts.map(post => {
      // Extract IP token IDs - remove 'all' as it's not a real token
      const ipTokenIds = (post.ipTokenIds || []).filter(id => id !== 'all');
      
      return {
        blobId: post.blobId || post.id || post.walrus_blob_id || post.walrus_cid,
        authorAddress: post.authorAddress || post.author,
        content: post.content || '',
        mediaType: post.mediaType || 'text',
        mediaBlobId: post.mediaBlobId || post.media_blob_id,
        ipTokenIds: ipTokenIds.length > 0 ? ipTokenIds : [], // Empty array if no specific IP tokens
        timestamp: post.timestamp || Date.now(),
        likes: post.likes || 0,
        comments: post.comments || 0,
        engagementType: post.engagement_type || 'post',
        postType: post.post_type || 'discover_post',
      };
    });

    // Sort by timestamp (newest first)
    postsWithIpTokens.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Group by IP token for easier aggregation
    const postsByIpToken = {};
    for (const post of postsWithIpTokens) {
      if (post.ipTokenIds.length === 0) {
        // Posts without specific IP tokens go under 'general'
        if (!postsByIpToken['general']) {
          postsByIpToken['general'] = [];
        }
        postsByIpToken['general'].push(post);
      } else {
        // Add post to each associated IP token
        for (const ipTokenId of post.ipTokenIds) {
          if (!postsByIpToken[ipTokenId]) {
            postsByIpToken[ipTokenId] = [];
          }
          postsByIpToken[ipTokenId].push(post);
        }
      }
    }

    // Calculate metrics per IP token
    const metricsByIpToken = {};
    for (const [ipTokenId, posts] of Object.entries(postsByIpToken)) {
      const totalPosts = posts.length;
      const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
      const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
      const imagePosts = posts.filter(p => p.mediaType === 'image').length;
      const videoPosts = posts.filter(p => p.mediaType === 'video').length;
      const textPosts = posts.filter(p => p.mediaType === 'text').length;
      const uniqueAuthors = new Set(posts.map(p => p.authorAddress)).size;
      
      // Get most recent post timestamp
      const mostRecentPost = posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
      const lastActivity = mostRecentPost ? mostRecentPost.timestamp : null;

      metricsByIpToken[ipTokenId] = {
        ipTokenId,
        totalPosts,
        totalLikes,
        totalComments,
        totalEngagement: totalLikes + totalComments,
        imagePosts,
        videoPosts,
        textPosts,
        uniqueAuthors,
        lastActivity,
        posts: posts.map(p => ({
          blobId: p.blobId,
          authorAddress: p.authorAddress,
          timestamp: p.timestamp,
          likes: p.likes,
          comments: p.comments,
          mediaType: p.mediaType,
        })),
      };
    }

    res.json({
      success: true,
      totalPosts: postsWithIpTokens.length,
      posts: postsWithIpTokens,
      metricsByIpToken,
      summary: {
        totalPosts: postsWithIpTokens.length,
        totalIpTokens: Object.keys(postsByIpToken).filter(id => id !== 'general').length,
        totalLikes: postsWithIpTokens.reduce((sum, p) => sum + (p.likes || 0), 0),
        totalComments: postsWithIpTokens.reduce((sum, p) => sum + (p.comments || 0), 0),
        totalEngagement: postsWithIpTokens.reduce((sum, p) => sum + (p.likes || 0) + (p.comments || 0), 0),
        uniqueAuthors: new Set(postsWithIpTokens.map(p => p.authorAddress)).size,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Error fetching posts for oracle metrics:', {
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Failed to fetch posts for oracle metrics',
        type: error?.name || 'UnknownError',
      },
      posts: [],
      metricsByIpToken: {},
      summary: {
        totalPosts: 0,
        totalIpTokens: 0,
        totalLikes: 0,
        totalComments: 0,
        totalEngagement: 0,
        uniqueAuthors: 0,
      },
    });
  }
});

/**
 * Get all posts
 * GET /api/posts
 * 
 * Query parameters:
 * - ipTokenId: Filter by IP token ID
 * - mediaType: Filter by media type (image, video, text)
 * - userAddress: Filter by user address (owner of the blob)
 * - limit: Limit number of results
 * - offset: Offset for pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const { ipTokenId, mediaType, userAddress, limit = 1000, offset = 0 } = req.query; // Increased limit to get all posts

    logger.info('Fetching all posts', { ipTokenId, mediaType, userAddress, limit, offset });

    // Get posts from smart contract (blob storage)
    let allPosts = [];
    try {
      // Fetch all blobs from the contract
      const { contractService } = await import('../services/contract.js');
      const contractBlobs = await contractService.getAllBlobs();
      logger.info(`Found ${contractBlobs.length} blobs from contract`);
      
      // CRITICAL: Build a map of originalBlobId -> metadata blob from indexer cache
      // The indexer cache stores metadata blobs with originalBlobId pointing to contract blobs
      // NOTE: For media posts, originalBlobId = mediaBlobId, but contract stores postBlobId
      // So we need to map by BOTH postBlobId AND mediaBlobId (and originalBlobId)
      const metadataMapByOriginal = new Map();
      for (const [metadataBlobId, metadata] of indexerService.blobCache.entries()) {
        const originalBlobId = metadata.originalBlobId || metadata.mediaBlobId;
        const postBlobId = metadata.postBlobId || metadata.blobId;
        const mediaBlobId = metadata.mediaBlobId || metadata.media_blob_id;
        
        // Create metadata post object
        const metadataPost = {
          ...metadata,
          blobId: metadataBlobId, // Use metadata blobId as primary blobId
          id: metadataBlobId,
          metadataBlobId: metadataBlobId, // Explicit metadata blobId
          originalBlobId: originalBlobId || postBlobId || metadataBlobId, // Original blobId
        };
        
        // Map by postBlobId (what's stored on contract)
        if (postBlobId) {
          metadataMapByOriginal.set(postBlobId, metadataPost);
          logger.debug(`Mapped metadata blob ${metadataBlobId} -> postBlobId ${postBlobId}`);
        }
        
        // Map by mediaBlobId (for media posts, this is what originalBlobId points to)
        if (mediaBlobId && mediaBlobId !== postBlobId) {
          metadataMapByOriginal.set(mediaBlobId, metadataPost);
          logger.debug(`Mapped metadata blob ${metadataBlobId} -> mediaBlobId ${mediaBlobId}`);
        }
        
        // Map by originalBlobId (for consistency)
        if (originalBlobId && originalBlobId !== postBlobId && originalBlobId !== mediaBlobId) {
          metadataMapByOriginal.set(originalBlobId, metadataPost);
          logger.debug(`Mapped metadata blob ${metadataBlobId} -> originalBlobId ${originalBlobId}`);
        }
        
        // Also map by metadataBlobId itself in case contract has the metadata blobId
        metadataMapByOriginal.set(metadataBlobId, metadataPost);
      }
      logger.info(`Found ${metadataMapByOriginal.size} metadata blob mappings in indexer cache (mapped by postBlobId/mediaBlobId/originalBlobId)`);
      
      // Read each blob from Walrus and map to metadata blobs
      for (const blob of contractBlobs) {
        try {
          // Check if we have a metadata blob for this contract blobId
          const metadataPost = metadataMapByOriginal.get(blob.blobId);
          
          if (metadataPost) {
            // Use metadata blob - it has likes/comments structure
            // Override content with contract text if available
            if (blob.text) {
              metadataPost.content = blob.text;
            }
            // Override timestamp with contract timestamp if available
            if (blob.timestamp) {
              metadataPost.timestamp = blob.timestamp;
            }
            allPosts.push(metadataPost);
            logger.debug(`Using metadata blob ${metadataPost.blobId} for contract blob ${blob.blobId}`);
          } else {
            // No metadata blob found - try reading original blob (might be a text post without metadata yet)
            try {
              const contribution = await walrusService.readContribution(blob.blobId);
              if (contribution.post_type === 'discover_post' || contribution.engagement_type === 'post') {
                // Override content with contract text if available
                if (blob.text) {
                  contribution.content = blob.text;
                }
                // Override timestamp with contract timestamp if available
                if (blob.timestamp) {
                  contribution.timestamp = blob.timestamp;
                }
                // Set originalBlobId so frontend knows this is the original (not metadata)
                contribution.originalBlobId = blob.blobId;
                allPosts.push(contribution);
              }
            } catch (readError) {
              // Likely binary media blob - skip it (we need metadata blob for likes/comments)
              logger.debug(`Skipping contract blob ${blob.blobId} (no metadata blob found):`, readError.message);
            }
          }
        } catch (error) {
          logger.debug(`Error processing contract blob ${blob.blobId}:`, error.message);
        }
      }
      
      logger.info(`Found ${allPosts.length} posts from contract blobs (${metadataMapByOriginal.size} with metadata blobs)`);
    } catch (error) {
      logger.warn('Error reading from contract, falling back to Sui query:', error);
      // Fallback: Query Walrus/Sui directly
      allPosts = await walrusService.getAllPosts({
        userAddress,
        ipTokenId,
      });
      logger.info(`Found ${allPosts.length} total posts from Walrus/Sui fallback`);
    }

    // If userAddress is provided, filter to show only that user's posts
    // Otherwise, show ALL posts (everyone can see everyone's posts)
    if (userAddress) {
      allPosts = allPosts.filter(post => 
        post.authorAddress === userAddress || post.author === userAddress
      );
    }

    // Filter by media type if specified
    if (mediaType) {
      allPosts = allPosts.filter((post) => post.mediaType === mediaType);
    }

    // Sort by timestamp (newest first)
    allPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Apply pagination
    const paginatedPosts = allPosts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      posts: paginatedPosts,
      total: allPosts.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Error fetching posts:', {
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Return error response instead of using next(error) to avoid 500
    res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Failed to fetch posts',
        type: error?.name || 'UnknownError',
      },
      posts: [],
      total: 0,
    });
  }
});

/**
 * Get a single post by blob ID
 * GET /api/posts/:blobId
 */
router.get('/:blobId', async (req, res, next) => {
  try {
    const { blobId } = req.params;

    logger.info(`Fetching post: ${blobId}`);

    const contribution = await walrusService.readContribution(blobId);

    if (contribution.post_type !== 'discover_post' && contribution.engagement_type !== 'post') {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    res.json({
      success: true,
      post: {
        id: blobId,
        blobId,
        ...contribution,
      },
    });
  } catch (error) {
    logger.error(`Error fetching post ${req.params.blobId}:`, error);
    next(error);
  }
});

/**
 * Like a post
 * POST /api/posts/:blobId/like
 */
router.post('/:blobId/like', async (req, res, next) => {
  try {
    const { blobId } = req.params;
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required',
      });
    }

    logger.info(`User ${userAddress} liking post ${blobId}`);

    // Read the post - try as contribution first, then as plain JSON
    let post;
    let actualBlobId = blobId;
    
    try {
      post = await walrusService.readContribution(blobId);
    } catch (error) {
      // If readContribution fails, try reading as plain blob
      try {
        const blobData = await walrusService.readBlob(blobId);
        
        // Check if it's binary data (media file) or JSON
        const jsonData = blobData.toString('utf-8');
        
        // Try to parse as JSON
        try {
          post = JSON.parse(jsonData);
        } catch (parseError) {
          // It's likely binary media data, not a post
          // Try to find the post that references this media blobId
          logger.info(`Blob ${blobId} appears to be media, searching for post that references it...`);
          
          let foundPost = null;
          const searchBlobIds = new Set();
          
          // First, get all blob IDs from the contract (most reliable)
          try {
            const contractBlobs = await contractService.getAllBlobs();
            for (const contractBlob of contractBlobs) {
              searchBlobIds.add(contractBlob.blobId);
            }
            logger.info(`Found ${searchBlobIds.size} blob IDs from contract to search`);
          } catch (contractError) {
            logger.warn('Could not get blob IDs from contract, using index only:', contractError.message);
          }
          
          // Also add blob IDs from the indexer
          for (const [ipTokenId, blobIds] of indexerService.index.entries()) {
            for (const postBlobId of blobIds) {
              searchBlobIds.add(postBlobId);
            }
          }
          
          // CRITICAL: Check indexer cache first - metadata blobs are cached there!
          logger.info(`[SEARCH] Checking indexer cache for metadata blob referencing ${blobId}...`);
          for (const [cachedBlobId, cachedMetadata] of indexerService.blobCache.entries()) {
            // Check all possible blobId references: postBlobId (contract), originalBlobId, mediaBlobId, or the cached blobId itself
            const postBlobId = cachedMetadata.postBlobId || cachedMetadata.blobId;
            const originalBlobId = cachedMetadata.originalBlobId;
            const mediaBlobId = cachedMetadata.mediaBlobId || cachedMetadata.media_blob_id;
            
            if (postBlobId === blobId || 
                originalBlobId === blobId || 
                mediaBlobId === blobId ||
                cachedBlobId === blobId) {
              logger.info(`[SEARCH] ✓ Found post in indexer cache: ${cachedBlobId} (postBlobId: ${postBlobId}, originalBlobId: ${originalBlobId}, mediaBlobId: ${mediaBlobId})`);
              foundPost = cachedMetadata;
              actualBlobId = cachedBlobId; // Use metadata blobId for updating likes/comments
              break;
            }
          }
          
          logger.info(`Searching through ${searchBlobIds.size} blob IDs for post referencing media/original blob ${blobId}`);
          
          // Search through all blob IDs to find the post metadata blob
          // IMPORTANT: Skip binary blobs, only check JSON/metadata blobs
          logger.info(`Checking ${searchBlobIds.size} candidate blobs for metadata referencing ${blobId}...`);
          for (const postBlobId of searchBlobIds) {
            try {
              // Read raw blob first to check if it's binary
              const candidateBlobData = await walrusService.readBlob(postBlobId);
              const candidateJson = candidateBlobData.toString('utf-8');
              
              // Check if it's binary data (images, videos, etc.) - skip these
              const isBinary = candidateJson.includes('\x00') || 
                               candidateJson.startsWith('RIFF') ||
                               candidateJson.startsWith('\x89PNG') ||
                               candidateJson.startsWith('GIF') ||
                               candidateJson.startsWith('ÿØÿà') ||
                               candidateJson.startsWith('\xFF\xD8\xFF') ||
                               candidateJson.startsWith('JFIF') ||
                               (candidateJson.length > 100 && candidateJson.match(/[^\x20-\x7E\n\r\t]/));
              
              if (isBinary) {
                // Skip binary blobs - they're media files, not post metadata
                logger.info(`[SEARCH] Skipping binary blob ${postBlobId} (media file)`);
                continue;
              }
              
              // Try to parse as JSON (post metadata)
              const candidatePost = JSON.parse(candidateJson);
              
              // Log what we found - use INFO so we can see it
              logger.info(`[SEARCH] Checking blob ${postBlobId}: post_type=${candidatePost.post_type}, engagement_type=${candidatePost.engagement_type}, mediaBlobId=${candidatePost.mediaBlobId}, originalBlobId=${candidatePost.originalBlobId}`);
              
              // Check if this post references the blobId (could be media, originalBlobId, or the post itself)
              if (candidatePost.mediaBlobId === blobId || 
                  candidatePost.media_blob_id === blobId ||
                  candidatePost.originalBlobId === blobId ||
                  postBlobId === blobId) {
                foundPost = candidatePost;
                actualBlobId = postBlobId;
                logger.info(`[SEARCH] ✓ Found post ${postBlobId} that references blob ${blobId} (mediaBlobId: ${candidatePost.mediaBlobId}, originalBlobId: ${candidatePost.originalBlobId})`);
                break;
              } else {
                logger.info(`[SEARCH] ✗ Blob ${postBlobId} does not reference ${blobId} (mediaBlobId: ${candidatePost.mediaBlobId}, originalBlobId: ${candidatePost.originalBlobId})`);
              }
            } catch (e) {
              // Skip this blob if it's binary or invalid JSON - try next one
              logger.info(`[SEARCH] Error checking blob ${postBlobId}: ${e.message}`);
              continue;
            }
          }
          
          // Always try searching all contract blobs if post not found
          if (!foundPost) {
            logger.info(`Post not found in initial search, querying ALL contract blobs for metadata...`);
            try {
              const { contractService } = await import('../services/contract.js');
              const contractBlobs = await contractService.getAllBlobs();
              logger.info(`Searching through ${contractBlobs.length} contract blobs for metadata referencing ${blobId}...`);
              
              for (const contractBlob of contractBlobs) {
                try {
                  // First check if blob is binary before trying to read as contribution
                  const rawBlobData = await walrusService.readBlob(contractBlob.blobId);
                  const blobString = rawBlobData.toString('utf-8');
                  
                  // Check if it's binary data (images, videos, etc.)
                  const isBinary = blobString.includes('\x00') || 
                                   blobString.startsWith('RIFF') ||
                                   blobString.startsWith('\x89PNG') ||
                                   blobString.startsWith('GIF') ||
                                   blobString.startsWith('ÿØÿà') ||
                                   blobString.startsWith('\xFF\xD8\xFF') ||
                                   blobString.startsWith('JFIF') ||
                                   (blobString.length > 100 && blobString.match(/[^\x20-\x7E\n\r\t]/));
                  
                  if (isBinary) {
                    // Skip binary blobs - they're media, not post metadata
                    logger.info(`[FALLBACK] Skipping binary contract blob ${contractBlob.blobId} (media file)`);
                    continue;
                  }
                  
                  // Try to parse as JSON
                  const candidatePost = JSON.parse(blobString);
                  
                  // Log what we found - use INFO so we can see it
                  logger.info(`[FALLBACK] Checking contract blob ${contractBlob.blobId}: post_type=${candidatePost.post_type}, engagement_type=${candidatePost.engagement_type}, mediaBlobId=${candidatePost.mediaBlobId}, originalBlobId=${candidatePost.originalBlobId}, blobId=${candidatePost.blobId}`);
                  
                  // Check if this post references the blobId (with backward compatibility for missing originalBlobId)
                  const matches = candidatePost.originalBlobId === blobId || 
                                  candidatePost.mediaBlobId === blobId ||
                                  candidatePost.media_blob_id === blobId ||
                                  candidatePost.blobId === blobId ||
                                  contractBlob.blobId === blobId ||
                                  // Backward compatibility: if originalBlobId is undefined but mediaBlobId matches
                                  (!candidatePost.originalBlobId && candidatePost.mediaBlobId === blobId);
                  
                  if ((candidatePost.post_type === 'discover_post' || candidatePost.engagement_type === 'post') && matches) {
                    foundPost = candidatePost;
                    actualBlobId = contractBlob.blobId;
                    logger.info(`[FALLBACK] ✓ Found post ${actualBlobId} by querying contract blobs directly (matches ${blobId})`);
                    break;
                  } else {
                    logger.info(`[FALLBACK] ✗ Contract blob ${contractBlob.blobId} does not reference ${blobId}`);
                  }
                } catch (e) {
                  // Skip binary blobs or invalid JSON - try next one
                  logger.info(`[FALLBACK] Error checking contract blob ${contractBlob.blobId}: ${e.message}`);
                  continue;
                }
              }
            } catch (queryError) {
              logger.error('Failed to query contract blobs:', queryError.message);
            }
          }
          
          // Final fallback: Query Walrus/Sui directly to find metadata blobs not on contract
          // Metadata blobs are stored on Walrus but might not be on the contract
          if (!foundPost) {
            logger.info(`[FINAL] Post still not found in contract blobs, querying Walrus/Sui directly for metadata blobs...`);
            try {
              // Query all posts from Walrus/Sui (includes metadata blobs not on contract)
              const allWalrusPosts = await walrusService.getAllPosts({ limit: 1000 });
              logger.info(`[FINAL] Found ${allWalrusPosts.length} posts from Walrus/Sui to search for metadata...`);
              
              // Search through all posts to find one that references this blobId
              for (const candidatePost of allWalrusPosts) {
                try {
                  const candidateBlobId = candidatePost.blobId || candidatePost.id;
                  logger.info(`[FINAL] Checking Walrus post ${candidateBlobId}: mediaBlobId=${candidatePost.mediaBlobId}, originalBlobId=${candidatePost.originalBlobId}`);
                  
                  // Check if this post references the blobId
                  const matches = candidatePost.mediaBlobId === blobId || 
                                  candidatePost.media_blob_id === blobId ||
                                  candidatePost.originalBlobId === blobId ||
                                  candidateBlobId === blobId;
                  
                  if (matches) {
                    foundPost = candidatePost;
                    actualBlobId = candidateBlobId;
                    logger.info(`[FINAL] ✓ Found post ${actualBlobId} by querying Walrus/Sui directly (references ${blobId})`);
                    break;
                  }
                } catch (e) {
                  logger.info(`[FINAL] Error checking Walrus post: ${e.message}`);
                  continue;
                }
              }
              
              // If still not found and blobId is media, try creating metadata blob on-the-fly
              // This handles posts created before metadata blob feature was added
              if (!foundPost) {
                logger.info(`[FINAL] Metadata blob not found for ${blobId}. This might be an old post without metadata blob.`);
                logger.info(`[FINAL] Note: For new posts, metadata blobs are created during indexing. For old posts, they may need to be re-indexed.`);
              }
            } catch (queryError) {
              logger.error('[FINAL] Failed to query Walrus/Sui for posts:', queryError.message);
            }
          }
          
          // If still not found, try to create metadata blob on-the-fly from contract data
          // This handles old posts that don't have metadata blobs
          if (!foundPost) {
            logger.info(`[AUTO-CREATE] Metadata blob not found for ${blobId}. Attempting to create one from contract data...`);
            
            try {
              // Check if this blobId exists on the contract
              const { contractService } = await import('../services/contract.js');
              const contractBlobs = await contractService.getAllBlobs();
              const contractBlob = contractBlobs.find(b => b.blobId === blobId);
              
              if (contractBlob && contractBlob.text) {
                // This is a text post, use it directly
                logger.info(`[AUTO-CREATE] Found contract blob with text, creating metadata blob...`);
                const postMetadata = {
                  post_type: 'discover_post',
                  engagement_type: 'post',
                  mediaType: 'text',
                  timestamp: contractBlob.timestamp || Date.now(),
                  authorAddress: contractBlob.address || '0x0000000000000000000000000000000000000000',
                  author: (contractBlob.address || '0x0000').slice(0, 6) + "..." + (contractBlob.address || '0000').slice(-4),
                  content: contractBlob.text,
                  ipTokenIds: ['all'], // Default to 'all' since we don't have this info
                  tags: [],
                  likes: 0,
                  comments: 0,
                  likesList: [],
                  commentsList: [],
                  originalBlobId: blobId,
                  postBlobId: blobId,
                };
                
                const jsonData = JSON.stringify(postMetadata, null, 2);
                const storedMetadata = await walrusService.storeBlob(jsonData, {
                  permanent: true,
                  epochs: 365,
                });
                
                foundPost = postMetadata;
                actualBlobId = storedMetadata.blobId || blobId;
                logger.info(`[AUTO-CREATE] ✓ Created metadata blob ${actualBlobId} for old post ${blobId}`);
              } else {
                // This might be a media blob - check if there's a post that references it
                logger.warn(`[AUTO-CREATE] Cannot auto-create metadata blob: blobId ${blobId} is not on contract or has no text`);
              }
            } catch (autoCreateError) {
              logger.error(`[AUTO-CREATE] Failed to auto-create metadata blob:`, autoCreateError.message);
            }
          }
          
          if (!foundPost) {
            logger.error(`Could not find or create post for blobId ${blobId} after searching contract blobs AND Walrus/Sui`);
            logger.error(`This post may have been created before metadata blobs were implemented. The post needs to be re-indexed to create a metadata blob for likes/comments.`);
            return res.status(404).json({
              success: false,
              error: 'Post not found. The post may have been created before metadata blobs were implemented and needs to be re-indexed.',
              details: 'Metadata blob not found. Please re-create or re-index this post to enable likes/comments.',
            });
          }
          
          post = foundPost;
        }
      } catch (readError) {
        logger.error(`Error reading post ${blobId}:`, readError);
        return res.status(404).json({
          success: false,
          error: 'Post not found',
        });
      }
    }

    // Accept posts with either post_type or engagement_type
    if (post.post_type !== 'discover_post' && post.engagement_type !== 'post') {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if already liked
    const likesList = post.likesList || [];
    const isLiked = likesList.includes(userAddress);

    if (isLiked) {
      // Unlike: remove from likes list
      const newLikesList = likesList.filter((addr) => addr !== userAddress);
      post.likesList = newLikesList;
      post.likes = Math.max(0, (post.likes || 0) - 1);
    } else {
      // Like: add to likes list
      post.likesList = [...likesList, userAddress];
      post.likes = (post.likes || 0) + 1;
    }

    // Store updated post back to Walrus using HTTP API method (same as uploads)
    // Convert post to JSON and store using HTTP API
    let updated;
    let newBlobId = actualBlobId;
    
    try {
      const jsonData = JSON.stringify(post, null, 2);
      // Use HTTP API method directly (same as uploads) - use backend wallet from ADMIN_PRIVATE_KEY
      // This wallet pays for storing the updated post with likes/comments
      updated = await walrusService.storeBlob(jsonData, {
        permanent: true,
        epochs: 365,
        // Use backend wallet address from ADMIN_PRIVATE_KEY - this wallet funds the operation
        userAddress: walrusService.walletAddress, // Backend wallet pays for storing likes/comments
      });
      newBlobId = updated.blobId || actualBlobId;
      logger.info(`Successfully stored updated post with likes: ${post.likes}, new blobId: ${newBlobId} via HTTP API (funded by wallet: ${walrusService.walletAddress})`);
    } catch (storeError) {
      logger.error(`Failed to store updated post to Walrus via HTTP API:`, {
        error: storeError.message,
        stack: storeError.stack,
        blobId: actualBlobId,
        likes: post.likes,
      });
      
      // Return error but include the updated like count so UI can update optimistically
      return res.status(500).json({
        success: false,
        error: `Failed to store like on Walrus: ${storeError.message}`,
        liked: !isLiked,
        likes: post.likes, // Return updated count even if storage failed
        blobId: actualBlobId, // Return original blobId
      });
    }

    res.json({
      success: true,
      liked: !isLiked,
      likes: post.likes,
      blobId: newBlobId,
    });
  } catch (error) {
    logger.error(`Error liking post ${req.params.blobId}:`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Return proper error response instead of using next(error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to like post',
      details: error.stack,
    });
  }
});

/**
 * Add a comment to a post
 * POST /api/posts/:blobId/comment
 */
router.post('/:blobId/comment', async (req, res, next) => {
  try {
    const { blobId } = req.params;
    const { userAddress, author, content } = req.body;

    if (!userAddress || !content) {
      return res.status(400).json({
        success: false,
        error: 'User address and content are required',
      });
    }

    logger.info(`User ${userAddress} commenting on post ${blobId}`);

    // Read the post - try as contribution first, then as plain JSON
    let post;
    let actualBlobId = blobId;
    
    try {
      post = await walrusService.readContribution(blobId);
    } catch (error) {
      // If readContribution fails, try reading as plain blob
      try {
        const blobData = await walrusService.readBlob(blobId);
        
        // Check if it's binary data (media file) or JSON
        const jsonData = blobData.toString('utf-8');
        
        // Try to parse as JSON
        try {
          post = JSON.parse(jsonData);
        } catch (parseError) {
          // It's likely binary media data, not a post
          // Try to find the post that references this media/blobId
          logger.info(`Blob ${blobId} appears to be media, searching for post that references it...`);
          
          let foundPost = null;
          const searchBlobIds = new Set();
          
          // CRITICAL: Check indexer cache first - metadata blobs are cached there!
          logger.info(`[SEARCH] Checking indexer cache for metadata blob referencing ${blobId}...`);
          for (const [cachedBlobId, cachedMetadata] of indexerService.blobCache.entries()) {
            // Check all possible blobId references: postBlobId (contract), originalBlobId, mediaBlobId, or the cached blobId itself
            const postBlobId = cachedMetadata.postBlobId || cachedMetadata.blobId;
            const originalBlobId = cachedMetadata.originalBlobId;
            const mediaBlobId = cachedMetadata.mediaBlobId || cachedMetadata.media_blob_id;
            
            if (postBlobId === blobId || 
                originalBlobId === blobId || 
                mediaBlobId === blobId ||
                cachedBlobId === blobId) {
              logger.info(`[SEARCH] ✓ Found post in indexer cache: ${cachedBlobId} (postBlobId: ${postBlobId}, originalBlobId: ${originalBlobId}, mediaBlobId: ${mediaBlobId})`);
              foundPost = cachedMetadata;
              actualBlobId = cachedBlobId; // Use metadata blobId for updating likes/comments
              break;
            }
          }
          
          // If not found in cache, search through contract and indexer blob IDs
          if (!foundPost) {
            // First, get all blob IDs from the contract (most reliable)
            try {
              const contractBlobs = await contractService.getAllBlobs();
              for (const contractBlob of contractBlobs) {
                searchBlobIds.add(contractBlob.blobId);
              }
              logger.info(`Found ${searchBlobIds.size} blob IDs from contract to search`);
            } catch (contractError) {
              logger.warn('Could not get blob IDs from contract, using index only:', contractError.message);
            }
            
            // Also add blob IDs from the indexer
            for (const [ipTokenId, blobIds] of indexerService.index.entries()) {
              for (const postBlobId of blobIds) {
                searchBlobIds.add(postBlobId);
              }
            }
            
            logger.info(`Searching through ${searchBlobIds.size} blob IDs for post referencing media/original blob ${blobId}`);
          }
          
          // Search through all blob IDs to find the post metadata blob
          for (const postBlobId of searchBlobIds) {
            try {
              const candidatePost = await walrusService.readContribution(postBlobId);
              // Check if this post references the blobId (could be media, originalBlobId, or the post itself)
              if (candidatePost.mediaBlobId === blobId || 
                  candidatePost.media_blob_id === blobId ||
                  candidatePost.originalBlobId === blobId ||
                  postBlobId === blobId) {
                foundPost = candidatePost;
                actualBlobId = postBlobId;
                logger.info(`Found post ${postBlobId} that references blob ${blobId} (mediaBlobId: ${candidatePost.mediaBlobId}, originalBlobId: ${candidatePost.originalBlobId})`);
                break;
              }
            } catch (e) {
              // Try reading as plain JSON
              try {
                const candidateBlobData = await walrusService.readBlob(postBlobId);
                const candidateJson = candidateBlobData.toString('utf-8');
                // Check if it's binary before trying to parse
                if (candidateJson.length > 0 && !candidateJson.includes('\x00')) {
                  const candidatePost = JSON.parse(candidateJson);
                  // Check if this post references the blobId
                  if (candidatePost.mediaBlobId === blobId || 
                      candidatePost.media_blob_id === blobId ||
                      candidatePost.originalBlobId === blobId ||
                      postBlobId === blobId) {
                    foundPost = candidatePost;
                    actualBlobId = postBlobId;
                    logger.info(`Found post ${postBlobId} that references blob ${blobId}`);
                    break;
                  }
                }
              } catch (e2) {
                // Skip this blob
              }
            }
          }
          
          // Final fallback: Query Walrus/Sui directly to find metadata blobs not on contract
          // Metadata blobs are stored on Walrus but might not be on the contract
          if (!foundPost) {
            logger.info(`Post still not found in contract blobs, querying Walrus/Sui directly for metadata blobs...`);
            try {
              // Query all posts from Walrus/Sui (includes metadata blobs not on contract)
              const allWalrusPosts = await walrusService.getAllPosts({ limit: 1000 });
              logger.info(`Found ${allWalrusPosts.length} posts from Walrus/Sui to search for metadata...`);
              
              // Search through all posts to find one that references this blobId
              for (const candidatePost of allWalrusPosts) {
                try {
                  // Check if this post references the blobId
                  if (candidatePost.mediaBlobId === blobId || 
                      candidatePost.media_blob_id === blobId ||
                      candidatePost.originalBlobId === blobId ||
                      candidatePost.blobId === blobId) {
                    foundPost = candidatePost;
                    actualBlobId = candidatePost.blobId || candidatePost.id;
                    logger.info(`Found post ${actualBlobId} by querying Walrus/Sui directly (references ${blobId})`);
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
            } catch (queryError) {
              logger.warn('Failed to query Walrus/Sui for posts:', queryError.message);
            }
          }
          
          if (!foundPost) {
            logger.error(`Could not find post for blobId ${blobId} after searching all sources`);
            return res.status(404).json({
              success: false,
              error: 'Post not found. The blobId may be for media, not the post data.',
            });
          }
          
          post = foundPost;
        }
      } catch (readError) {
        logger.error(`Error reading post ${blobId}:`, readError);
        return res.status(404).json({
          success: false,
          error: 'Post not found',
        });
      }
    }

    // Accept posts with either post_type or engagement_type
    if (post.post_type !== 'discover_post' && post.engagement_type !== 'post') {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Add comment
    const commentsList = post.commentsList || [];
    const newComment = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      author: author || userAddress.slice(0, 6) + '...' + userAddress.slice(-4),
      authorAddress: userAddress,
      content,
      timestamp: Date.now(),
    };

    post.commentsList = [...commentsList, newComment];
    post.comments = (post.comments || 0) + 1;

    // Store updated post back to Walrus using HTTP API method (same as uploads)
    // Convert post to JSON and store using HTTP API
    let updated;
    let newBlobId = actualBlobId;
    
    try {
      const jsonData = JSON.stringify(post, null, 2);
      // Use HTTP API method directly (same as uploads) - use backend wallet from ADMIN_PRIVATE_KEY
      // This wallet pays for storing the updated post with comments
      updated = await walrusService.storeBlob(jsonData, {
        permanent: true,
        epochs: 365,
        // Use backend wallet address from ADMIN_PRIVATE_KEY - this wallet funds the operation
        userAddress: walrusService.walletAddress, // Backend wallet pays for storing comments
      });
      newBlobId = updated.blobId || actualBlobId;
      logger.info(`Successfully stored updated post with comments: ${post.comments}, new blobId: ${newBlobId} via HTTP API (funded by wallet: ${walrusService.walletAddress})`);
    } catch (storeError) {
      logger.error(`Failed to store updated post to Walrus via HTTP API:`, {
        error: storeError.message,
        stack: storeError.stack,
        blobId: actualBlobId,
        comments: post.comments,
      });
      
      // Return error but include the updated comment so UI can update optimistically
      return res.status(500).json({
        success: false,
        error: `Failed to store comment on Walrus: ${storeError.message}`,
        comment: newComment,
        comments: post.comments, // Return updated count even if storage failed
        blobId: actualBlobId, // Return original blobId
      });
    }

    res.json({
      success: true,
      comment: newComment,
      comments: post.comments,
      blobId: newBlobId,
    });
  } catch (error) {
    logger.error(`Error commenting on post ${req.params.blobId}:`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Return proper error response instead of using next(error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to comment on post',
      details: error.stack,
    });
  }
});

/**
 * Upload media file to Walrus
 * POST /api/posts/upload-media
 * 
 * Accepts multipart/form-data with 'file' field
 * Or JSON with base64 'data' field
 */
router.post('/upload-media', upload.single('file'), async (req, res, next) => {
  try {
    let buffer;
    let filename;
    let contentType;

    if (req.file) {
      // File uploaded via multer
      buffer = req.file.buffer;
      filename = req.file.originalname;
      contentType = req.file.mimetype;
    } else if (req.body.data) {
      // Base64 data in JSON body
      const { data, filename: fn, contentType: ct } = req.body;
      filename = fn || 'media';
      contentType = ct || 'application/octet-stream';
      
      if (typeof data === 'string') {
        // Remove data URL prefix if present (e.g., "data:image/png;base64,...")
        const base64Data = data.includes(',') ? data.split(',')[1] : data;
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = Buffer.from(data);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Media file or data is required. Send multipart/form-data with "file" field or JSON with "data" field.',
      });
    }

    logger.info(`Uploading media file to Walrus: ${filename} (${buffer.length} bytes, ${contentType})`);

    // Store on Walrus (permanent, 365 epochs)
    const result = await walrusService.storeBlob(buffer, {
      permanent: true,
      epochs: 365,
    });

    logger.info(`Media uploaded successfully to Walrus: ${result.blobId}`);

    res.json({
      success: true,
      blobId: result.blobId,
      size: result.size,
      contentType,
      filename,
    });
  } catch (error) {
    logger.error('Error uploading media:', error);
    next(error);
  }
});

/**
 * Debug endpoint: Get index status
 * GET /api/posts/debug/index
 */
router.get('/debug/index', async (req, res, next) => {
  try {
    // Access the indexer's internal index (for debugging)
    const indexMap = indexerService.index || new Map();
    const cacheMap = indexerService.blobCache || new Map();
    
    const indexStatus = {};
    for (const [tokenId, blobIds] of indexMap.entries()) {
      indexStatus[tokenId] = {
        blobCount: blobIds.length,
        blobIds: blobIds.slice(0, 10), // First 10 for preview
      };
    }

    res.json({
      success: true,
      indexSize: indexMap.size,
      cacheSize: cacheMap.size,
      tokens: Object.keys(indexStatus),
      index: indexStatus,
      note: 'Index is in-memory and will be lost on server restart. Posts need to be re-indexed after restart.',
    });
  } catch (error) {
    logger.error('Error getting index status:', error);
    next(error);
  }
});

/**
 * Re-index a post by blob ID
 * POST /api/posts/reindex
 * 
 * Body: { blobId: string, userAddress?: string }
 * 
 * If userAddress is provided, queries Walrus for that user's posts and re-indexes them.
 * Otherwise, requires blobId to re-index a specific post.
 */
router.post('/reindex', async (req, res, next) => {
  try {
    const { blobId, userAddress } = req.body;

    if (userAddress) {
      // Re-index all posts from a user
      logger.info(`Re-indexing all posts for user: ${userAddress}`);
      const contributions = await walrusService.getContributionsByOwner(userAddress);
      
      let reindexed = 0;
      for (const contribution of contributions) {
        const blobId = contribution.blobId || contribution.id;
        if (!blobId) continue;

        // Extract IP token IDs from contribution
        const ipTokenIds = contribution.ipTokenIds && Array.isArray(contribution.ipTokenIds) && contribution.ipTokenIds.length > 0
          ? contribution.ipTokenIds
          : ['all'];

        // Re-index for each IP token
        for (const ipTokenId of ipTokenIds) {
          await indexerService.indexContribution(ipTokenId, blobId, contribution);
        }
        reindexed++;
      }

      res.json({
        success: true,
        reindexed,
        userAddress,
        message: `Re-indexed ${reindexed} posts for user ${userAddress}`,
      });
    } else if (blobId) {
      // Re-index a specific post
      logger.info(`Re-indexing post: ${blobId}`);
      const contribution = await walrusService.readContribution(blobId);
      
      const ipTokenIds = contribution.ipTokenIds && Array.isArray(contribution.ipTokenIds) && contribution.ipTokenIds.length > 0
        ? contribution.ipTokenIds
        : ['all'];

      for (const ipTokenId of ipTokenIds) {
        await indexerService.indexContribution(ipTokenId, blobId, contribution);
      }

      res.json({
        success: true,
        blobId,
        ipTokenIds,
        message: `Re-indexed post ${blobId}`,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either blobId or userAddress is required',
      });
    }
  } catch (error) {
    logger.error('Error re-indexing:', error);
    next(error);
  }
});

/**
 * Manual endpoint to retrieve all blob IDs
 * GET /api/posts/manual-blob-ids
 * 
 * This endpoint tries multiple methods to find blob IDs:
 * 1. Query Sui events
 * 2. Query Sui blob objects by type
 * 3. Query known addresses for blob objects
 */
router.get('/manual-blob-ids', async (req, res, next) => {
  try {
    logger.info('Manual blob ID retrieval requested');
    
    const results = {
      fromSuiEvents: [],
      fromSuiObjects: [],
      fromKnownAddresses: [],
      allBlobIds: [],
    };

    // Method 1: Query Sui events
    try {
      logger.info('Method 1: Querying Sui events...');
      const events = await walrusService.suiClient.queryEvents({
        query: {
          MoveModule: {
            package: '0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af',
            module: 'walrus',
          },
        },
        limit: 500,
        order: 'descending',
      });

      logger.info(`Found ${events.data.length} Walrus events`);
      
      for (const event of events.data) {
        const blobId = event.parsedJson?.blobId || 
                      event.parsedJson?.blob_id ||
                      event.parsedJson?.id ||
                      event.parsedJson?.blobObject?.blobId ||
                      event.parsedJson?.blobObject?.id;
        if (blobId && !results.fromSuiEvents.includes(blobId)) {
          results.fromSuiEvents.push(blobId);
        }
      }
      
      logger.info(`Extracted ${results.fromSuiEvents.length} blob IDs from events`);
    } catch (error) {
      logger.error('Error querying Sui events:', error.message);
    }

    // Method 2: Query blob objects by owner (if we have addresses from events)
    try {
      const addresses = new Set();
      
      // Get addresses from events
      const events = await walrusService.suiClient.queryEvents({
        query: {
          MoveModule: {
            package: '0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af',
            module: 'walrus',
          },
        },
        limit: 100,
        order: 'descending',
      });

      for (const event of events.data) {
        const sender = event.sender || event.parsedJson?.sender || event.parsedJson?.owner;
        if (sender) {
          addresses.add(sender);
        }
      }

      logger.info(`Found ${addresses.size} addresses from events, querying for blob objects...`);

      for (const address of addresses) {
        try {
          const blobIds = await walrusService.queryBlobsByOwner(address);
          results.fromKnownAddresses.push(...blobIds);
          logger.info(`Found ${blobIds.length} blob objects for address ${address.slice(0, 10)}...`);
        } catch (err) {
          logger.debug(`Error querying blobs for ${address}:`, err.message);
        }
      }
    } catch (error) {
      logger.error('Error querying blob objects by owner:', error.message);
    }

    // Combine all blob IDs and remove duplicates
    results.allBlobIds = [...new Set([
      ...results.fromSuiEvents,
      ...results.fromKnownAddresses,
    ])];

    logger.info(`Total unique blob IDs found: ${results.allBlobIds.length}`);

    res.json({
      success: true,
      total: results.allBlobIds.length,
      methods: {
        fromSuiEvents: results.fromSuiEvents.length,
        fromKnownAddresses: results.fromKnownAddresses.length,
      },
      blobIds: results.allBlobIds,
      details: {
        fromSuiEvents: results.fromSuiEvents,
        fromKnownAddresses: results.fromKnownAddresses,
      },
    });
  } catch (error) {
    logger.error('Error in manual blob ID retrieval:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

