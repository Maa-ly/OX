import express from 'express';
import multer from 'multer';
import { logger } from '../utils/logger.js';
import { WalrusService } from '../services/walrus.js';
import { WalrusIndexerService, getIndexerService } from '../services/walrus-indexer.js';
// Blob storage is now handled on-chain via smart contract

const router = express.Router();
const walrusService = new WalrusService();
const indexerService = getIndexerService(); // Use singleton instance

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

    // Index the post for each IP token (already stored on Walrus by user)
    // This makes the post visible to everyone when they query posts
    for (const ipTokenId of ipTokenIds) {
      try {
        await indexerService.indexContribution(
          ipTokenId,
          blobId,
          {
            post_type: 'discover_post',
            engagement_type: 'post',
            mediaType: post?.mediaType || 'text',
            timestamp: post?.timestamp || Date.now(),
            authorAddress: post?.authorAddress,
            ...post,
          }
        );
        logger.info(`Indexed post ${blobId} for token ${ipTokenId}`);
      } catch (indexError) {
        // Log but don't fail - post is still stored on Walrus
        logger.warn(`Failed to index post ${blobId} for token ${ipTokenId}:`, {
          error: indexError?.message,
          stack: indexError?.stack,
        });
      }
    }

    // Log index state for debugging
    logger.info(`Post indexed successfully. In-memory index now has posts for: ${ipTokenIds.join(', ')}`);

    res.json({
      success: true,
      blobId,
      indexed: true,
      ipTokenIds,
      post: {
        ...post,
        walrus_blob_id: blobId,
        walrus_cid: blobId,
        blobId,
        id: blobId,
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

    // Read the post
    const post = await walrusService.readContribution(blobId);

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

    // Store updated post back to Walrus
    // Note: This creates a new blob. In production, you might want to use a different approach
    // like storing likes/comments separately or using on-chain storage
    const updated = await walrusService.storeContribution(post);

    res.json({
      success: true,
      liked: !isLiked,
      likes: post.likes,
      blobId: updated.walrus_blob_id || updated.walrus_cid,
    });
  } catch (error) {
    logger.error(`Error liking post ${req.params.blobId}:`, error);
    next(error);
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

    // Read the post
    const post = await walrusService.readContribution(blobId);

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

    // Store updated post back to Walrus
    const updated = await walrusService.storeContribution(post);

    res.json({
      success: true,
      comment: newComment,
      comments: post.comments,
      blobId: updated.walrus_blob_id || updated.walrus_cid,
    });
  } catch (error) {
    logger.error(`Error commenting on post ${req.params.blobId}:`, error);
    next(error);
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

