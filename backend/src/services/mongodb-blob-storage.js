import { logger } from '../utils/logger.js';
import { UserBlob } from '../models/UserBlob.js';
import { mongoDBService } from './mongodb.js';

/**
 * MongoDB-based blob storage service
 * Stores user -> blob IDs mapping in MongoDB (like the NFT project)
 */
class MongoDBBlobStorage {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize - ensure MongoDB is connected
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await mongoDBService.connect();
      this.initialized = true;
      logger.info('MongoDB blob storage initialized');
    } catch (error) {
      logger.error('Failed to initialize MongoDB blob storage:', error);
      throw error;
    }
  }

  /**
   * Add a blob ID for a user
   */
  async addBlobId(userAddress, blobId, metadata = {}) {
    if (!userAddress || !blobId) {
      logger.warn('addBlobId: userAddress and blobId are required');
      return false;
    }

    try {
      await this.initialize();
      
      const userBlob = await UserBlob.findOrCreate(userAddress);
      const added = userBlob.addBlobId(blobId, metadata);
      
      if (added) {
        await userBlob.save();
        logger.info(`Added blob ${blobId} for user ${userAddress}`);
        return true;
      } else {
        logger.debug(`Blob ${blobId} already exists for user ${userAddress}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to add blob ID ${blobId} for user ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get all blob IDs for a user
   */
  async getUserBlobIds(userAddress) {
    if (!userAddress) return [];

    try {
      await this.initialize();
      
      const userBlob = await UserBlob.findOne({ userAddress });
      return userBlob ? userBlob.blobIds : [];
    } catch (error) {
      logger.error(`Failed to get blob IDs for user ${userAddress}:`, error);
      return [];
    }
  }

  /**
   * Get all blob IDs from all users
   */
  async getAllBlobIds() {
    try {
      await this.initialize();
      
      const allUserBlobs = await UserBlob.find({});
      const allBlobIds = [];
      
      allUserBlobs.forEach(userBlob => {
        allBlobIds.push(...userBlob.blobIds);
      });
      
      return allBlobIds;
    } catch (error) {
      logger.error('Failed to get all blob IDs:', error);
      return [];
    }
  }

  /**
   * Get blob IDs for multiple users
   */
  async getBlobIdsForUsers(userAddresses) {
    if (!userAddresses || userAddresses.length === 0) return [];

    try {
      await this.initialize();
      
      const userBlobs = await UserBlob.find({ 
        userAddress: { $in: userAddresses } 
      });
      
      const allBlobIds = [];
      userBlobs.forEach(userBlob => {
        allBlobIds.push(...userBlob.blobIds);
      });
      
      return allBlobIds;
    } catch (error) {
      logger.error('Failed to get blob IDs for users:', error);
      return [];
    }
  }

  /**
   * Remove a blob ID for a user
   */
  async removeBlobId(userAddress, blobId) {
    if (!userAddress || !blobId) return false;

    try {
      await this.initialize();
      
      const userBlob = await UserBlob.findOne({ userAddress });
      if (userBlob) {
        const removed = userBlob.removeBlobId(blobId);
        if (removed) {
          await userBlob.save();
          logger.info(`Removed blob ${blobId} for user ${userAddress}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error(`Failed to remove blob ID ${blobId} for user ${userAddress}:`, error);
      return false;
    }
  }

  /**
   * Get blob metadata
   */
  async getBlobMetadata(userAddress, blobId) {
    try {
      await this.initialize();
      
      const userBlob = await UserBlob.findOne({ userAddress });
      if (userBlob && userBlob.metadata.has(blobId)) {
        return userBlob.metadata.get(blobId);
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get blob metadata:`, error);
      return null;
    }
  }

  /**
   * Get count of users
   */
  async getUserCount() {
    try {
      await this.initialize();
      return await UserBlob.countDocuments();
    } catch (error) {
      logger.error('Failed to get user count:', error);
      return 0;
    }
  }

  /**
   * Get total blob count
   */
  async getTotalBlobCount() {
    try {
      await this.initialize();
      
      const result = await UserBlob.aggregate([
        {
          $project: {
            count: { $size: '$blobIds' }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$count' }
          }
        }
      ]);
      
      return result.length > 0 ? result[0].total : 0;
    } catch (error) {
      logger.error('Failed to get total blob count:', error);
      return 0;
    }
  }
}

// Export singleton instance
let instance = null;
export function getMongoDBBlobStorage() {
  if (!instance) {
    instance = new MongoDBBlobStorage();
  }
  return instance;
}

export const mongoDBBlobStorage = getMongoDBBlobStorage();

