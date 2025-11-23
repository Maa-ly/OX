import express from 'express';
import UserProfile from '../models/UserProfile.js';
import { logger } from '../utils/logger.js';
import { WalrusService } from '../services/walrus.js';
import multer from 'multer';

const router = express.Router();
const walrusService = new WalrusService();

// Configure multer for profile picture uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile pictures
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures'));
    }
  },
});

/**
 * Get user profile by address or username
 * GET /api/user/profile/:identifier
 */
router.get('/profile/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    
    const profile = await UserProfile.getProfile(identifier);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }
    
    res.json({
      success: true,
      profile: {
        userAddress: profile.userAddress,
        username: profile.username,
        profilePicture: profile.profilePicture,
        displayName: profile.displayName,
        bio: profile.bio,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    next(error);
  }
});

/**
 * Create or update user profile
 * POST /api/user/profile
 * Body: { userAddress, username?, displayName?, bio?, profilePicture? }
 */
router.post('/profile', async (req, res, next) => {
  try {
    const { userAddress, username, displayName, bio, profilePicture } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'userAddress is required',
      });
    }
    
    // Normalize username: empty string or null becomes null
    const normalizedUsername = username && username.trim() ? username.toLowerCase().trim() : null;
    
    // Check if username is provided and available
    if (normalizedUsername) {
      // Validate username format
      if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        return res.status(400).json({
          success: false,
          error: 'Username can only contain lowercase letters, numbers, and underscores',
        });
      }
      
      if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
        return res.status(400).json({
          success: false,
          error: 'Username must be between 3 and 30 characters',
        });
      }
      
      // Check if username is already taken by another user
      const existing = await UserProfile.findOne({ 
        username: normalizedUsername,
        userAddress: { $ne: userAddress } // Exclude current user
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Username is already taken',
        });
      }
    }
    
    // Find or create profile
    let profile = await UserProfile.findOne({ userAddress });
    
    if (profile) {
      // Update existing profile
      if (username !== undefined) profile.username = normalizedUsername;
      if (displayName !== undefined) profile.displayName = displayName || null;
      if (bio !== undefined) profile.bio = bio || null;
      if (profilePicture !== undefined) profile.profilePicture = profilePicture || null;
      profile.updatedAt = new Date();
      await profile.save();
    } else {
      // Create new profile
      profile = await UserProfile.create({
        userAddress,
        username: normalizedUsername,
        displayName: displayName && displayName.trim() ? displayName.trim() : null,
        bio: bio && bio.trim() ? bio.trim() : null,
        profilePicture: profilePicture || null,
      });
    }
    
    res.json({
      success: true,
      profile: {
        userAddress: profile.userAddress,
        username: profile.username,
        profilePicture: profile.profilePicture,
        displayName: profile.displayName,
        bio: profile.bio,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error creating/updating user profile:', error);
    
    // Handle duplicate key error (username)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Username is already taken',
      });
    }
    
    next(error);
  }
});

/**
 * Upload profile picture
 * POST /api/user/profile-picture
 * Form data: file (image)
 * Query: userAddress
 */
router.post('/profile-picture', upload.single('file'), async (req, res, next) => {
  try {
    const { userAddress } = req.query;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'userAddress is required',
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required',
      });
    }
    
    logger.info(`Uploading profile picture for user: ${userAddress} (${req.file.size} bytes, ${req.file.mimetype})`);
    
    // Upload to Walrus
    let result;
    try {
      result = await walrusService.storeBlob(req.file.buffer, {
        permanent: true,
        epochs: 365,
      });
      logger.info(`Profile picture uploaded successfully: ${result.blobId}`);
    } catch (walrusError) {
      logger.error('Error uploading profile picture to Walrus:', walrusError);
      
      // Provide helpful error message
      let errorMessage = 'Failed to upload profile picture to storage';
      if (walrusError.message) {
        if (walrusError.message.includes('not found') || walrusError.message.includes('walrus')) {
          errorMessage = 'Storage service is not properly configured. Please check backend configuration.';
        } else if (walrusError.message.includes('WAL') || walrusError.message.includes('balance')) {
          errorMessage = 'Insufficient storage credits. Please contact administrator.';
        } else {
          errorMessage = `Failed to upload profile picture: ${walrusError.message}`;
        }
      }
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
        details: walrusError.message,
      });
    }
    
    // Update user profile with profile picture blob ID
    let profile = await UserProfile.findOne({ userAddress });
    
    if (profile) {
      profile.profilePicture = result.blobId;
      profile.updatedAt = new Date();
      await profile.save();
    } else {
      // Create profile if it doesn't exist
      profile = await UserProfile.create({
        userAddress,
        profilePicture: result.blobId,
      });
    }
    
    res.json({
      success: true,
      blobId: result.blobId,
      profilePicture: result.blobId,
      profile: {
        userAddress: profile.userAddress,
        username: profile.username,
        profilePicture: profile.profilePicture,
        displayName: profile.displayName,
        bio: profile.bio,
      },
    });
  } catch (error) {
    logger.error('Error uploading profile picture:', error);
    
    // Provide user-friendly error message
    const errorMessage = error.message || 'Failed to upload profile picture';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * Check if username is available
 * GET /api/user/check-username/:username
 */
router.get('/check-username/:username', async (req, res, next) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        available: false,
        error: 'Username is required',
      });
    }
    
    const normalized = username.toLowerCase().trim();
    
    // Validate format
    if (!/^[a-z0-9_]+$/.test(normalized)) {
      return res.json({
        success: true,
        available: false,
        error: 'Username can only contain lowercase letters, numbers, and underscores',
      });
    }
    
    if (normalized.length < 3 || normalized.length > 30) {
      return res.json({
        success: true,
        available: false,
        error: 'Username must be between 3 and 30 characters',
      });
    }
    
    const available = await UserProfile.isUsernameAvailable(normalized);
    
    res.json({
      success: true,
      available,
      username: normalized,
    });
  } catch (error) {
    logger.error('Error checking username:', error);
    next(error);
  }
});

export default router;

