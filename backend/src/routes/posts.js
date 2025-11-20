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
 * Store a new post
 * POST /api/posts
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      content,
      mediaType,
      mediaUrl,
      mediaBlobId,
      ipTokenIds,
      author,
      authorAddress,
      tags,
    } = req.body;

    if (!content || !ipTokenIds || !Array.isArray(ipTokenIds) || ipTokenIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content and at least one IP token ID are required',
      });
    }

    if (!authorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Author address is required',
      });
    }

    logger.info(`Storing post from ${authorAddress} for IP tokens: ${ipTokenIds.join(', ')}`);

    // Create post object
    const post = {
      post_type: 'discover_post',
      engagement_type: 'post',
      content,
      mediaType: mediaType || 'text',
      mediaUrl,
      mediaBlobId,
      ipTokenIds,
      author: author || authorAddress.slice(0, 6) + '...' + authorAddress.slice(-4),
      authorAddress,
      timestamp: Date.now(),
      tags: tags || [],
      likes: 0,
      comments: 0,
      likesList: [], // Array of wallet addresses who liked
      commentsList: [], // Array of comment objects
    };

    // Store post on Walrus
    const stored = await walrusService.storeContribution(post);

    // Index the post for each IP token
    for (const ipTokenId of ipTokenIds) {
      await indexerService.indexContribution(
        ipTokenId,
        stored.walrus_blob_id || stored.walrus_cid,
        {
          post_type: 'discover_post',
          mediaType: post.mediaType,
          timestamp: post.timestamp,
        }
      );
    }

    logger.info(`Post stored successfully: ${stored.walrus_blob_id || stored.walrus_cid}`);

    res.json({
      success: true,
      post: {
        id: stored.walrus_blob_id || stored.walrus_cid,
        blobId: stored.walrus_blob_id || stored.walrus_cid,
        ...post,
      },
      blobId: stored.walrus_blob_id || stored.walrus_cid,
    });
  } catch (error) {
    logger.error('Error storing post:', error);
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

