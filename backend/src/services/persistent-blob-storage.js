import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Persistent blob storage service
 * Stores user -> blob IDs mapping in a JSON file
 * This ensures blob IDs persist across server restarts
 */
class PersistentBlobStorage {
  constructor() {
    // Store in backend/data directory
    this.dataDir = path.join(__dirname, '../../data');
    this.storageFile = path.join(this.dataDir, 'user-blob-ids.json');
    this.cache = null; // Cache the data in memory for fast access
    this.initialized = false;
  }

  /**
   * Initialize storage - ensure data directory exists
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load existing data if file exists
      try {
        const data = await fs.readFile(this.storageFile, 'utf-8');
        this.cache = JSON.parse(data);
        logger.info(`Loaded ${Object.keys(this.cache).length} users from persistent blob storage`);
      } catch (error) {
        // File doesn't exist yet, start with empty cache
        this.cache = {};
        logger.info('Starting with empty persistent blob storage');
      }
      
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize persistent blob storage:', error);
      // Fallback to in-memory only
      this.cache = {};
      this.initialized = true;
    }
  }

  /**
   * Save cache to disk
   */
  async save() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Ensure directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Write to file atomically (write to temp file, then rename)
      const tempFile = `${this.storageFile}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(this.cache, null, 2), 'utf-8');
      await fs.rename(tempFile, this.storageFile);
      
      logger.debug(`Saved ${Object.keys(this.cache).length} users to persistent blob storage`);
    } catch (error) {
      logger.error('Failed to save persistent blob storage:', error);
      // Don't throw - we can continue with in-memory cache
    }
  }

  /**
   * Add a blob ID for a user
   */
  async addBlobId(userAddress, blobId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.cache[userAddress]) {
      this.cache[userAddress] = [];
    }

    // Avoid duplicates
    if (!this.cache[userAddress].includes(blobId)) {
      this.cache[userAddress].push(blobId);
      await this.save();
      logger.info(`Added blob ${blobId} for user ${userAddress}`);
      return true;
    }

    return false;
  }

  /**
   * Get all blob IDs for a user
   */
  async getBlobIds(userAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.cache[userAddress] || [];
  }

  /**
   * Get all blob IDs from all users
   */
  async getAllBlobIds() {
    if (!this.initialized) {
      await this.initialize();
    }

    const allBlobIds = [];
    Object.values(this.cache).forEach(blobIds => {
      allBlobIds.push(...blobIds);
    });
    return allBlobIds;
  }

  /**
   * Get blob IDs for multiple users
   */
  async getBlobIdsForUsers(userAddresses) {
    const allBlobIds = [];
    for (const address of userAddresses) {
      const blobIds = await this.getBlobIds(address);
      allBlobIds.push(...blobIds);
    }
    return allBlobIds;
  }

  /**
   * Remove a blob ID for a user
   */
  async removeBlobId(userAddress, blobId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.cache[userAddress]) {
      this.cache[userAddress] = this.cache[userAddress].filter(id => id !== blobId);
      await this.save();
      return true;
    }

    return false;
  }

  /**
   * Get the entire map (for debugging)
   */
  async getMap() {
    if (!this.initialized) {
      await this.initialize();
    }

    return { ...this.cache };
  }
}

// Export singleton instance
let instance = null;
export function getPersistentBlobStorage() {
  if (!instance) {
    instance = new PersistentBlobStorage();
  }
  return instance;
}

export const persistentBlobStorage = getPersistentBlobStorage();

