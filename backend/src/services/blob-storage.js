import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

/**
 * Simple file-based storage for blob IDs
 * Stores all blob IDs in a JSON file so they persist across server restarts
 */
export class BlobStorageService {
  constructor() {
    // Store blob IDs in a JSON file
    const dataDir = join(process.cwd(), 'data');
    this.blobIdsFile = join(dataDir, 'blob-ids.json');
    this.blobMetadataFile = join(dataDir, 'blob-metadata.json');
    this.blobIds = new Set(); // In-memory cache
    this.blobMetadata = new Map(); // blobId -> full metadata
    
    // Ensure data directory exists
    this.ensureDataDir();
    
    // Load existing blob IDs on startup
    this.loadBlobIds();
  }

  async ensureDataDir() {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
      logger.info(`Created data directory: ${dataDir}`);
    }
  }

  /**
   * Load blob IDs and metadata from files
   */
  async loadBlobIds() {
    try {
      // Load blob IDs
      if (existsSync(this.blobIdsFile)) {
        const data = await readFile(this.blobIdsFile, 'utf-8');
        const blobIdsArray = JSON.parse(data);
        this.blobIds = new Set(blobIdsArray);
        logger.info(`Loaded ${this.blobIds.size} blob IDs from storage`);
      } else {
        logger.info('No existing blob IDs file found, starting fresh');
        this.blobIds = new Set();
      }

      // Load metadata
      if (existsSync(this.blobMetadataFile)) {
        const metadataData = await readFile(this.blobMetadataFile, 'utf-8');
        const metadataObj = JSON.parse(metadataData);
        this.blobMetadata = new Map(Object.entries(metadataObj));
        logger.info(`Loaded metadata for ${this.blobMetadata.size} blobs`);
      } else {
        this.blobMetadata = new Map();
      }
    } catch (error) {
      logger.error('Error loading blob IDs:', error);
      this.blobIds = new Set();
      this.blobMetadata = new Map();
    }
  }

  /**
   * Save blob IDs and metadata to files
   */
  async saveBlobIds() {
    try {
      await this.ensureDataDir();
      
      // Save blob IDs
      const blobIdsArray = Array.from(this.blobIds);
      await writeFile(this.blobIdsFile, JSON.stringify(blobIdsArray, null, 2), 'utf-8');
      logger.debug(`Saved ${blobIdsArray.length} blob IDs to storage`);
      
      // Save metadata
      const metadataObj = Object.fromEntries(this.blobMetadata);
      await writeFile(this.blobMetadataFile, JSON.stringify(metadataObj, null, 2), 'utf-8');
      logger.debug(`Saved metadata for ${this.blobMetadata.size} blobs`);
    } catch (error) {
      logger.error('Error saving blob IDs:', error);
      throw error;
    }
  }

  /**
   * Add a blob ID to storage
   * @param {string} blobId - Blob ID to add
   * @param {Object} metadata - Full upload response metadata (optional)
   */
  async addBlobId(blobId, metadata = {}) {
    if (!blobId) {
      logger.warn('Attempted to add empty blob ID');
      return;
    }

    if (!this.blobIds.has(blobId)) {
      this.blobIds.add(blobId);
      
      // Store full metadata if provided
      if (metadata && Object.keys(metadata).length > 0) {
        this.blobMetadata.set(blobId, {
          ...metadata,
          storedAt: Date.now(),
        });
      }
      
      await this.saveBlobIds();
      logger.info(`Added blob ID to storage: ${blobId}`, metadata);
    } else {
      logger.debug(`Blob ID already exists: ${blobId}`);
    }
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

