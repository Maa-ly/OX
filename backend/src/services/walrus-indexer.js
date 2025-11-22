import { SuiClient } from '@mysten/sui/client';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { WalrusService } from './walrus.js';

/**
 * Walrus Indexer Service
 * 
 * Maintains an index of contributions by IP token ID
 * by querying Sui blob objects and reading their metadata.
 * 
 * Reference: https://docs.wal.app/dev-guide/sui-struct.html
 */
export class WalrusIndexerService {
  constructor() {
    this.suiClient = new SuiClient({ url: config.sui.rpcUrl });
    this.walrusService = new WalrusService();
    
    // In-memory index (in production, use a database)
    this.index = new Map(); // ipTokenId -> [blobId1, blobId2, ...]
    
    // Cache for blob metadata
    this.blobCache = new Map(); // blobId -> metadata
  }

  /**
   * Index a contribution
   * 
   * Called when a new contribution is stored
   * 
   * @param {string} ipTokenId - IP token ID
   * @param {string} blobId - Blob ID
   * @param {Object} metadata - Contribution metadata
   */
  async indexContribution(ipTokenId, blobId, metadata = {}) {
    if (!this.index.has(ipTokenId)) {
      this.index.set(ipTokenId, []);
    }

    const blobIds = this.index.get(ipTokenId);
    if (!blobIds.includes(blobId)) {
      blobIds.push(blobId);
      this.blobCache.set(blobId, {
        ipTokenId,
        blobId,
        ...metadata,
        indexedAt: Date.now(),
      });
    }

    logger.debug(`Indexed contribution: ${ipTokenId} -> ${blobId}`);
  }

  /**
   * Query contributions by IP token ID
   * 
   * @param {string} ipTokenId - IP token ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of contributions
   */
  async queryContributionsByIP(ipTokenId, options = {}) {
    try {
      logger.info(`Querying indexed contributions for IP token: ${ipTokenId}`);

      // Get blob IDs from index
      const blobIds = this.index.get(ipTokenId) || [];

      logger.debug(`Index has ${blobIds.length} blob IDs for token ${ipTokenId}`);

      // Filter by options
      let filteredBlobIds = blobIds;

      if (options.type) {
        // Filter by type (requires reading blob to check)
        filteredBlobIds = await this.filterByType(blobIds, options.type);
      }

      if (options.startTime || options.endTime) {
        // Filter by time range
        filteredBlobIds = await this.filterByTimeRange(
          filteredBlobIds,
          options.startTime,
          options.endTime
        );
      }

      // Read contributions from Walrus
      const contributions = [];
      for (const blobId of filteredBlobIds) {
        try {
          const contribution = await this.walrusService.readContribution(blobId);
          contributions.push(contribution);
        } catch (error) {
          logger.warn(`Failed to read contribution ${blobId}:`, error.message);
          // Remove from index if blob no longer exists
          const blobIds = this.index.get(ipTokenId);
          if (blobIds) {
            const index = blobIds.indexOf(blobId);
            if (index > -1) {
              blobIds.splice(index, 1);
            }
          }
          this.blobCache.delete(blobId);
        }
      }

      logger.info(`Found ${contributions.length} contributions for ${ipTokenId} (from ${filteredBlobIds.length} blob IDs)`);
      return contributions;
    } catch (error) {
      logger.error('Error querying contributions:', error);
      throw new Error(`Failed to query contributions: ${error.message}`);
    }
  }

  /**
   * Filter blob IDs by contribution type
   */
  async filterByType(blobIds, type) {
    const filtered = [];

    for (const blobId of blobIds) {
      const cached = this.blobCache.get(blobId);
      if (cached?.engagement_type === type) {
        filtered.push(blobId);
        continue;
      }

      // Read blob to check type
      try {
        const contribution = await this.walrusService.readContribution(blobId);
        if (contribution.engagement_type === type) {
          filtered.push(blobId);
          // Update cache
          this.blobCache.set(blobId, {
            ...this.blobCache.get(blobId),
            engagement_type: type,
          });
        }
      } catch (error) {
        logger.warn(`Failed to read blob ${blobId} for type filter:`, error.message);
      }
    }

    return filtered;
  }

  /**
   * Filter blob IDs by time range
   */
  async filterByTimeRange(blobIds, startTime, endTime) {
    const filtered = [];

    for (const blobId of blobIds) {
      const cached = this.blobCache.get(blobId);
      if (cached?.timestamp) {
        const timestamp = cached.timestamp;
        if (
          (!startTime || timestamp >= startTime) &&
          (!endTime || timestamp <= endTime)
        ) {
          filtered.push(blobId);
        }
        continue;
      }

      // Read blob to check timestamp
      try {
        const contribution = await this.walrusService.readContribution(blobId);
        if (contribution.timestamp) {
          const timestamp = contribution.timestamp;
          if (
            (!startTime || timestamp >= startTime) &&
            (!endTime || timestamp <= endTime)
          ) {
            filtered.push(blobId);
            // Update cache
            this.blobCache.set(blobId, {
              ...this.blobCache.get(blobId),
              timestamp: contribution.timestamp,
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to read blob ${blobId} for time filter:`, error.message);
      }
    }

    return filtered;
  }

  /**
   * Rebuild index from Sui
   * 
   * Scans Sui for blob objects and rebuilds the index
   * This is useful for initial setup or recovery
   */
  async rebuildIndex() {
    try {
      logger.info('Rebuilding contribution index from Sui...');

      // TODO: Query Sui for all blob objects
      // This requires:
      // 1. Querying blob objects from the system object
      // 2. Reading blob metadata to extract IP token IDs
      // 3. Indexing them

      // For now, this is a placeholder
      logger.warn('rebuildIndex not fully implemented - requires Sui blob object querying');
    } catch (error) {
      logger.error('Error rebuilding index:', error);
      throw new Error(`Failed to rebuild index: ${error.message}`);
    }
  }
}

