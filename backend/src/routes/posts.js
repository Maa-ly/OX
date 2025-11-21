import express from 'express';
import multer from 'multer';
import { logger } from '../utils/logger.js';
import { WalrusService } from '../services/walrus.js';
import { WalrusIndexerService } from '../services/walrus-indexer.js';

const router = express.Router();
const walrusService = new WalrusService();
const indexerService = new WalrusIndexerService();

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
    const { blobId, post } = req.body;

    if (!blobId) {
      return res.status(400).json({
        success: false,
        error: 'blobId is required',
      });
    }

    if (!post?.ipTokenIds || !Array.isArray(post.ipTokenIds) || post.ipTokenIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'post.ipTokenIds (array with at least one IP token ID) is required',
      });
    }

    logger.info(`Indexing post for IP tokens: ${post.ipTokenIds.join(', ')}, blobId: ${blobId}`);

    // Index the post for each IP token (already stored on Walrus by user)
    for (const ipTokenId of post.ipTokenIds) {
      await indexerService.indexContribution(
        ipTokenId,
        blobId,
        {
          post_type: 'discover_post',
          engagement_type: 'post',
          mediaType: post.mediaType || 'text',
          timestamp: post.timestamp || Date.now(),
          authorAddress: post.authorAddress,
          ...post,
        }
      );
    }

    res.json({
      success: true,
      blobId,
      indexed: true,
      post: {
        ...post,
        walrus_blob_id: blobId,
        walrus_cid: blobId,
        blobId,
        id: blobId,
      },
    });
  } catch (error) {
    logger.error('Error indexing post:', error);
    next(error);
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
 * - limit: Limit number of results
 * - offset: Offset for pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const { ipTokenId, mediaType, limit = 50, offset = 0 } = req.query;

    logger.info('Fetching posts', { ipTokenId, mediaType, limit, offset });

    let allPosts = [];

    if (ipTokenId) {
      // Get posts for specific IP token
      const contributions = await indexerService.queryContributionsByIP(ipTokenId, {
        type: 'post',
      });

      allPosts = contributions
        .filter((c) => c.post_type === 'discover_post' || c.engagement_type === 'post')
        .map((c) => ({
          id: c.walrus_cid || c.walrus_blob_id || c.id,
          blobId: c.walrus_cid || c.walrus_blob_id || c.id,
          ...c,
        }));
    } else {
      // Get all posts from all tokens
      // First, get all token IDs from contract
      const { contractService } = await import('../services/contract.js');
      const tokenIds = await contractService.getAllTokens();

      for (const tokenId of tokenIds) {
        try {
          const contributions = await indexerService.queryContributionsByIP(tokenId, {
            type: 'post',
          });

          const posts = contributions
            .filter((c) => c.post_type === 'discover_post' || c.engagement_type === 'post')
            .map((c) => ({
              id: c.walrus_cid || c.walrus_blob_id || c.id,
              blobId: c.walrus_cid || c.walrus_blob_id || c.id,
              ...c,
            }));

          allPosts.push(...posts);
        } catch (error) {
          logger.warn(`Failed to fetch posts for token ${tokenId}:`, error.message);
        }
      }
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
    logger.error('Error fetching posts:', error);
    next(error);
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

export default router;

