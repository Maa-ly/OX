import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

/**
 * Storage service for blob IDs
 * 
 * Supports multiple storage backends:
 * 1. Vercel KV (Redis) - for production/serverless (recommended)
 * 2. File system - for local development
 * 3. In-memory only - fallback if both fail
 */
export class BlobStorageService {
  constructor() {
    this.blobIds = new Set(); // In-memory cache (global)
    this.userBlobMap = new Map(); // userAddress -> Set of blobIds (like NFT project)
    this.blobMetadata = new Map(); // blobId -> full metadata
    this.useKv = false;
    this.kv = null;
    
    // Try to initialize Vercel KV (for production/serverless)
    this.initKv();
    
    // If KV not available, use file system (for local development)
    if (!this.useKv) {
      const dataDir = join(process.cwd(), 'data');
      this.blobIdsFile = join(dataDir, 'blob-ids.json');
      this.userBlobMapFile = join(dataDir, 'user-blob-ids.json'); // Per-user storage
      this.blobMetadataFile = join(dataDir, 'blob-metadata.json');
      this.ensureDataDir();
      this.loadBlobIds();
    } else {
      // Load from KV on startup
      this.loadBlobIds();
    }
  }

  /**
   * Initialize Vercel KV if available
   */
  async initKv() {
    try {
      // Try to import @vercel/kv
      const kvModule = await import('@vercel/kv').catch(() => null);
      if (kvModule && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        this.kv = kvModule.kv({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        });
        this.useKv = true;
        logger.info('Using Vercel KV for blob storage (production mode)');
        return;
      }
    } catch (error) {
      logger.debug('Vercel KV not available, using file system:', error.message);
    }
    
    // Check if we're on Vercel but KV not configured
    if (process.env.VERCEL && !this.useKv) {
      logger.warn('Running on Vercel but KV not configured. Blob IDs will be stored in memory only.');
      logger.warn('To enable persistent storage, add KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
    }
  }

  async ensureDataDir() {
    try {
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
        logger.info(`Created data directory: ${dataDir}`);
      }
    } catch (error) {
      // On Vercel/serverless, file system is read-only - use /tmp as fallback
      if (error.code === 'EROFS' || error.code === 'EACCES') {
        const tmpDir = '/tmp/data';
        if (!existsSync(tmpDir)) {
          await mkdir(tmpDir, { recursive: true });
          logger.info(`Using /tmp/data directory (read-only filesystem detected)`);
        }
        this.blobIdsFile = join(tmpDir, 'blob-ids.json');
        this.blobMetadataFile = join(tmpDir, 'blob-metadata.json');
      } else {
        throw error;
      }
    }
  }

  /**
   * Load blob IDs and metadata from storage (KV or file)
   */
  async loadBlobIds() {
    try {
      if (this.useKv && this.kv) {
        // Load from Vercel KV
        try {
          const blobIdsArray = await this.kv.get('blob-ids') || [];
          this.blobIds = new Set(blobIdsArray);
          
          // Load user -> blob IDs mapping
          const userBlobMapObj = await this.kv.get('user-blob-ids') || {};
          this.userBlobMap = new Map();
          Object.entries(userBlobMapObj).forEach(([user, blobIds]) => {
            this.userBlobMap.set(user, new Set(blobIds));
          });
          
          const metadataObj = await this.kv.get('blob-metadata') || {};
          this.blobMetadata = new Map(Object.entries(metadataObj));
          
          logger.info(`Loaded ${this.blobIds.size} blob IDs and ${this.userBlobMap.size} users from KV storage`);
        } catch (kvError) {
          logger.warn('Failed to load from KV, starting fresh:', kvError.message);
          this.blobIds = new Set();
          this.userBlobMap = new Map();
          this.blobMetadata = new Map();
        }
      } else {
        // Load from file system
        if (existsSync(this.blobIdsFile)) {
          const data = await readFile(this.blobIdsFile, 'utf-8');
          const blobIdsArray = JSON.parse(data);
          this.blobIds = new Set(blobIdsArray);
          logger.info(`Loaded ${this.blobIds.size} blob IDs from file storage`);
        } else {
          logger.info('No existing blob IDs file found, starting fresh');
          this.blobIds = new Set();
        }

        // Load user -> blob IDs mapping (like NFT project)
        if (existsSync(this.userBlobMapFile)) {
          const userBlobData = await readFile(this.userBlobMapFile, 'utf-8');
          const userBlobMapObj = JSON.parse(userBlobData);
          this.userBlobMap = new Map();
          Object.entries(userBlobMapObj).forEach(([user, blobIds]) => {
            this.userBlobMap.set(user, new Set(blobIds));
          });
          logger.info(`Loaded blob IDs for ${this.userBlobMap.size} users from file storage`);
        } else {
          this.userBlobMap = new Map();
        }

        if (existsSync(this.blobMetadataFile)) {
          const metadataData = await readFile(this.blobMetadataFile, 'utf-8');
          const metadataObj = JSON.parse(metadataData);
          this.blobMetadata = new Map(Object.entries(metadataObj));
          logger.info(`Loaded metadata for ${this.blobMetadata.size} blobs`);
        } else {
          this.blobMetadata = new Map();
        }
      }
    } catch (error) {
      logger.error('Error loading blob IDs:', error);
      this.blobIds = new Set();
      this.userBlobMap = new Map();
      this.blobMetadata = new Map();
    }
  }

  /**
   * Save blob IDs and metadata to storage (KV or file)
   */
  async saveBlobIds() {
    try {
      if (this.useKv && this.kv) {
        // Save to Vercel KV
        const blobIdsArray = Array.from(this.blobIds);
        const userBlobMapObj = Object.fromEntries(
          Array.from(this.userBlobMap.entries()).map(([user, blobIds]) => [user, Array.from(blobIds)])
        );
        const metadataObj = Object.fromEntries(this.blobMetadata);
        
        await Promise.all([
          this.kv.set('blob-ids', blobIdsArray),
          this.kv.set('user-blob-ids', userBlobMapObj),
          this.kv.set('blob-metadata', metadataObj),
        ]);
        
        logger.debug(`Saved ${blobIdsArray.length} blob IDs and ${this.userBlobMap.size} users to KV storage`);
      } else {
        // Save to file system
        await this.ensureDataDir();
        
        const blobIdsArray = Array.from(this.blobIds);
        await writeFile(this.blobIdsFile, JSON.stringify(blobIdsArray, null, 2), 'utf-8');
        logger.debug(`Saved ${blobIdsArray.length} blob IDs to file storage`);
        
        // Save user -> blob IDs mapping
        const userBlobMapObj = Object.fromEntries(
          Array.from(this.userBlobMap.entries()).map(([user, blobIds]) => [user, Array.from(blobIds)])
        );
        await writeFile(this.userBlobMapFile, JSON.stringify(userBlobMapObj, null, 2), 'utf-8');
        logger.debug(`Saved blob IDs for ${this.userBlobMap.size} users to file storage`);
        
        const metadataObj = Object.fromEntries(this.blobMetadata);
        await writeFile(this.blobMetadataFile, JSON.stringify(metadataObj, null, 2), 'utf-8');
        logger.debug(`Saved metadata for ${this.blobMetadata.size} blobs`);
      }
    } catch (error) {
      // On Vercel/serverless without KV, file system is read-only - keep data in memory only
      if (error.code === 'EROFS' || error.code === 'EACCES' || error.message?.includes('read-only')) {
        logger.warn('File system is read-only (serverless environment). Blob IDs will be stored in memory only.', {
          error: error.message,
          code: error.code,
          suggestion: 'Configure Vercel KV for persistent storage',
        });
        // Don't throw - allow in-memory storage to continue
        return;
      }
      logger.error('Error saving blob IDs:', error);
      // Don't throw - allow operation to continue with in-memory storage
    }
  }

  /**
   * Add a blob ID to storage
   * @param {string} blobId - Blob ID to add
   * @param {Object} metadata - Full upload response metadata (optional)
   * @param {string} userAddress - User address (optional, for per-user storage like NFT project)
   */
  async addBlobId(blobId, metadata = {}, userAddress = null) {
    if (!blobId) {
      logger.warn('Attempted to add empty blob ID');
      return;
    }

    if (!this.blobIds.has(blobId)) {
      this.blobIds.add(blobId);
      
      // Store per-user (like NFT project)
      if (userAddress) {
        if (!this.userBlobMap.has(userAddress)) {
          this.userBlobMap.set(userAddress, new Set());
        }
        this.userBlobMap.get(userAddress).add(blobId);
        logger.info(`Added blob ${blobId} for user ${userAddress}`);
      }
      
      // Store full metadata if provided
      if (metadata && Object.keys(metadata).length > 0) {
        this.blobMetadata.set(blobId, {
          ...metadata,
          storedAt: Date.now(),
          userAddress: userAddress || metadata.userAddress,
        });
      }
      
      // Try to save to file, but don't fail if it doesn't work (e.g., on Vercel)
      try {
        await this.saveBlobIds();
        logger.info(`Added blob ID to storage: ${blobId}`, { userAddress, ...metadata });
      } catch (saveError) {
        // File save failed (likely read-only filesystem on Vercel)
        // Continue with in-memory storage only
        logger.warn(`Failed to save blob ID to file (using in-memory storage): ${saveError.message}`, {
          blobId,
          error: saveError?.code,
        });
        logger.info(`Added blob ID to in-memory storage: ${blobId}`);
      }
    } else {
      logger.debug(`Blob ID already exists: ${blobId}`);
    }
  }

  /**
   * Get blob IDs for a specific user (like NFT project)
   * @param {string} userAddress - User address
   * @returns {Array<string>} Array of blob IDs for this user
   */
  getUserBlobIds(userAddress) {
    if (!userAddress) return [];
    const blobIds = this.userBlobMap.get(userAddress);
    return blobIds ? Array.from(blobIds) : [];
  }

  /**
   * Get all blob IDs from all users
   * @returns {Array<string>} Array of all blob IDs
   */
  getAllUserBlobIds() {
    const allBlobIds = [];
    this.userBlobMap.forEach((blobIds) => {
      allBlobIds.push(...Array.from(blobIds));
    });
    return allBlobIds;
  }

  /**
   * Get metadata for a blob ID
   * @param {string} blobId - Blob ID
   * @returns {Object|null} Metadata or null if not found
   */
  getBlobMetadata(blobId) {
    return this.blobMetadata.get(blobId) || null;
  }

  /**
   * Get all blob IDs
   * @returns {Array<string>} Array of blob IDs
   */
  getAllBlobIds() {
    return Array.from(this.blobIds);
  }

  /**
   * Remove a blob ID from storage
   * @param {string} blobId - Blob ID to remove
   */
  async removeBlobId(blobId) {
    if (this.blobIds.has(blobId)) {
      this.blobIds.delete(blobId);
      await this.saveBlobIds();
      logger.info(`Removed blob ID from storage: ${blobId}`);
    }
  }

  /**
   * Check if a blob ID exists
   * @param {string} blobId - Blob ID to check
   * @returns {boolean} True if blob ID exists
   */
  hasBlobId(blobId) {
    return this.blobIds.has(blobId);
  }

  /**
   * Get count of stored blob IDs
   * @returns {number} Number of blob IDs
   */
  getCount() {
    return this.blobIds.size;
  }
}

// Export singleton instance
export const blobStorage = new BlobStorageService();

