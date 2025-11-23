/**
 * Price Feed Orchestrator Service
 * 
 * Aggregates data from multiple sources (Walrus posts, likes, comments, Nautilus external data)
 * and generates price feeds that can be streamed to the frontend.
 * 
 * Features:
 * - OHLC (Open, High, Low, Close) tracking
 * - Price calculation based on engagement metrics
 * - Fallback mechanisms for stale/stagnant prices
 * - WebSocket/SSE support for real-time streaming
 */

import { logger } from '../utils/logger.js';
import { WalrusIndexerService } from './walrus-indexer.js';
import { AggregationService } from './aggregation.js';
import { NautilusService } from './nautilus.js';
import { SuiService } from './sui.js';

export class PriceFeedService {
  constructor() {
    this.indexerService = new WalrusIndexerService();
    this.aggregationService = new AggregationService();
    this.nautilusService = new NautilusService();
    this.suiService = new SuiService();
    
    // Price history storage (in-memory, can be moved to DB)
    this.priceHistory = new Map(); // ipTokenId -> Array of { timestamp, open, high, low, close, volume }
    
    // Current prices cache
    this.currentPrices = new Map(); // ipTokenId -> { price, timestamp, ohlc, metrics }
    
    // Price calculation configuration
    this.config = {
      // Base price multiplier (how much engagement affects price)
      engagementMultiplier: 0.001, // 0.1% per engagement point
      
      // Engagement weights
      weights: {
        post: 1.0,        // 1 point per post
        like: 0.1,        // 0.1 points per like
        comment: 0.3,     // 0.3 points per comment
        rating: 0.5,      // 0.5 points per rating
        meme: 1.5,        // 1.5 points per meme (more valuable)
        prediction: 2.0,  // 2.0 points per prediction
        stake: 3.0,       // 3.0 points per stake (shows commitment)
      },
      
      // Fallback thresholds
      dropThreshold: 0.5,      // 50% drop from high triggers price reduction
      stagnationHours: 48,     // 48 hours of no change triggers price reduction
      stagnationDropRate: 0.01, // 1% drop per hour after stagnation
      
      // Price update interval (ms)
      updateInterval: 60000,   // 1 minute
      
      // Minimum price (to prevent going to zero)
      minPrice: 1000000,       // 0.001 SUI (scaled by 1e9)
    };
    
    // Active WebSocket connections for streaming
    this.connections = new Set();
    
    // Active SSE connections for streaming
    this.sseConnections = new Map(); // res -> listener function
    
    // Update interval timer
    this.updateTimer = null;
  }

  /**
   * Start the price feed service
   * Begins periodic price updates
   */
  start() {
    logger.info('Starting Price Feed Service...');
    
    // Initial price update
    this.updateAllPrices().catch(err => {
      logger.error('Error in initial price update:', err);
    });
    
    // Set up periodic updates
    this.updateTimer = setInterval(() => {
      this.updateAllPrices().catch(err => {
        logger.error('Error in periodic price update:', err);
      });
    }, this.config.updateInterval);
    
    logger.info('Price Feed Service started');
  }

  /**
   * Stop the price feed service
   */
  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    logger.info('Price Feed Service stopped');
  }

  /**
   * Update prices for all IP tokens
   */
  async updateAllPrices() {
    try {
      // Get all IP tokens from contract
      const { contractService } = await import('./contract.js');
      const tokens = await contractService.getAllTokens({ detailed: true });
      
      logger.info(`Updating prices for ${tokens.length} tokens`);
      
      if (tokens.length === 0) {
        logger.warn('No tokens found. Price feed will have no data until tokens are created.');
        return { successful: 0, failed: 0, tokens: 0 };
      }
      
      // Update each token's price
      const updates = await Promise.allSettled(
        tokens.map(token => {
          const tokenId = token.id || token.tokenId;
          const tokenName = token.name || token.symbol || 'Unknown';
          return this.updatePriceForToken(tokenId, tokenName);
        })
      );
      
      const successful = updates.filter(u => u.status === 'fulfilled').length;
      const failed = updates.filter(u => u.status === 'rejected').length;
      
      // Log failed updates for debugging
      updates.forEach((update, index) => {
        if (update.status === 'rejected') {
          const token = tokens[index];
          logger.error(`Failed to update price for token ${token?.id || token?.tokenId}:`, update.reason);
        }
      });
      
      logger.info(`Price update complete: ${successful} successful, ${failed} failed out of ${tokens.length} tokens`);
      
      // Broadcast updates to connected clients
      this.broadcastPriceUpdates();
      
      return { successful, failed, tokens: tokens.length };
    } catch (error) {
      logger.error('Error updating all prices:', error);
      // Don't throw - allow service to continue running
      return { successful: 0, failed: 0, tokens: 0, error: error.message };
    }
  }

  /**
   * Update price for a specific IP token
   */
  async updatePriceForToken(ipTokenId, tokenName) {
    try {
      if (!ipTokenId) {
        throw new Error('ipTokenId is required');
      }
      
      logger.debug(`Updating price for token: ${tokenName} (${ipTokenId})`);
      
      // Get current price from contract (if exists)
      const { contractService } = await import('./contract.js');
      let basePrice = null;
      try {
        basePrice = await contractService.getPrice(ipTokenId);
        logger.debug(`Found existing price for ${ipTokenId}: ${basePrice}`);
      } catch (error) {
        logger.debug(`No existing price for ${ipTokenId}, will calculate from base`);
      }
      
      // Get engagement metrics from posts, likes, comments
      const engagementMetrics = await this.getEngagementMetrics(ipTokenId);
      logger.debug(`Engagement metrics for ${ipTokenId}:`, {
        totalEngagement: engagementMetrics.totalEngagement,
        posts: engagementMetrics.postCount,
        likes: engagementMetrics.likeCount,
        comments: engagementMetrics.commentCount,
      });
      
      // Get external metrics from Nautilus (if enabled)
      let nautilusMetrics = [];
      try {
        nautilusMetrics = await this.nautilusService.fetchMultipleSources({
          ipTokenId,
          name: tokenName,
          sources: ['myanimelist', 'anilist'],
        });
        logger.debug(`Nautilus metrics for ${tokenName}: ${nautilusMetrics.length} sources`);
      } catch (error) {
        logger.debug(`Nautilus metrics unavailable for ${tokenName}:`, error.message);
      }
      
      // Calculate new price based on engagement
      const newPrice = await this.calculatePrice(
        ipTokenId,
        basePrice,
        engagementMetrics,
        nautilusMetrics
      );
      
      // Get or create OHLC data
      const ohlc = this.getOrCreateOHLC(ipTokenId, newPrice);
      
      // Update current price cache (ensure ipTokenId is stored correctly)
      this.currentPrices.set(ipTokenId, {
        price: newPrice,
        timestamp: Date.now(),
        ohlc,
        metrics: engagementMetrics,
        nautilusMetrics,
        tokenName, // Store token name for reference
      });
      
      // Add to price history
      this.addToPriceHistory(ipTokenId, {
        timestamp: Date.now(),
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: newPrice,
        volume: engagementMetrics.totalEngagement,
      });
      
      logger.info(`Price updated for ${tokenName} (${ipTokenId}): ${newPrice / 1e9} SUI`);
      
      return {
        ipTokenId,
        price: newPrice,
        ohlc,
        metrics: engagementMetrics,
      };
    } catch (error) {
      logger.error(`Error updating price for ${ipTokenId}:`, error);
      // Initialize with minimum price if update fails
      const minPrice = this.config.minPrice;
      const fallbackOHLC = {
        open: minPrice,
        high: minPrice,
        low: minPrice,
        close: minPrice,
        timestamp: Date.now(),
      };
      this.currentPrices.set(ipTokenId, {
        price: minPrice,
        timestamp: Date.now(),
        ohlc: fallbackOHLC,
        metrics: { totalEngagement: 0 },
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get engagement metrics from posts, likes, comments
   */
  async getEngagementMetrics(ipTokenId) {
    try {
      // Get all contributions for this IP token
      const contributions = await this.indexerService.queryContributionsByIP(ipTokenId);
      
      // Get posts from discover page (via backend posts API)
      const posts = await this.getPostsForToken(ipTokenId);
      
      // Calculate engagement scores
      let totalEngagement = 0;
      let postCount = 0;
      let likeCount = 0;
      let commentCount = 0;
      let ratingCount = 0;
      let memeCount = 0;
      let predictionCount = 0;
      let stakeCount = 0;
      
      // Count contributions by type
      for (const contribution of contributions) {
        const type = contribution.engagement_type;
        const weight = this.config.weights[type] || 0;
        
        switch (type) {
          case 'post':
            postCount++;
            totalEngagement += this.config.weights.post;
            break;
          case 'rating':
            ratingCount++;
            totalEngagement += this.config.weights.rating;
            break;
          case 'meme':
            memeCount++;
            totalEngagement += this.config.weights.meme;
            break;
          case 'episode_prediction':
          case 'price_prediction':
            predictionCount++;
            totalEngagement += this.config.weights.prediction;
            break;
          case 'stake':
            stakeCount++;
            totalEngagement += this.config.weights.stake;
            break;
        }
      }
      
      // Count likes and comments from posts
      for (const post of posts) {
        likeCount += post.likes || 0;
        commentCount += post.comments || 0;
        totalEngagement += (post.likes || 0) * this.config.weights.like;
        totalEngagement += (post.comments || 0) * this.config.weights.comment;
      }
      
      // Calculate engagement velocity (recent activity)
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const recentEngagement = contributions.filter(
        c => c.timestamp >= oneHourAgo
      ).length;
      
      return {
        totalEngagement,
        postCount,
        likeCount,
        commentCount,
        ratingCount,
        memeCount,
        predictionCount,
        stakeCount,
        recentEngagement,
        totalContributions: contributions.length,
      };
    } catch (error) {
      logger.error(`Error getting engagement metrics for ${ipTokenId}:`, error);
      return {
        totalEngagement: 0,
        postCount: 0,
        likeCount: 0,
        commentCount: 0,
        ratingCount: 0,
        memeCount: 0,
        predictionCount: 0,
        stakeCount: 0,
        recentEngagement: 0,
        totalContributions: 0,
      };
    }
  }

  /**
   * Get posts for a token from Walrus/contract
   */
  async getPostsForToken(ipTokenId) {
    try {
      // Import services dynamically to avoid circular dependencies
      const { contractService } = await import('./contract.js');
      const { walrusService } = await import('./walrus.js');
      
      // Get all blobs from contract
      let contractBlobs = [];
      try {
        contractBlobs = await contractService.getAllBlobs();
      } catch (error) {
        logger.debug(`Could not fetch contract blobs:`, error.message);
        return [];
      }
      
      // Filter and read posts for this IP token
      const posts = [];
      for (const blob of contractBlobs) {
        try {
          const contribution = await walrusService.readContribution(blob.blobId);
          if (contribution && (contribution.post_type === 'discover_post' || contribution.engagement_type === 'post')) {
            // Check if post is associated with this IP token
            const postIpTokens = contribution.ipTokenIds || [];
            if (postIpTokens.includes(ipTokenId) || postIpTokens.length === 0) {
              posts.push({
                blobId: blob.blobId,
                likes: contribution.likes || 0,
                comments: contribution.comments || 0,
                timestamp: contribution.timestamp || blob.timestamp || Date.now(),
              });
            }
          }
        } catch (readError) {
          // Skip if we can't read the blob
          logger.debug(`Failed to read blob ${blob.blobId}:`, readError.message);
        }
      }
      
      return posts;
    } catch (error) {
      logger.error(`Error fetching posts for ${ipTokenId}:`, error);
      return [];
    }
  }

  /**
   * Calculate price based on engagement metrics
   */
  async calculatePrice(ipTokenId, basePrice, engagementMetrics, nautilusMetrics = []) {
    // If no base price, use minimum price
    if (!basePrice || basePrice === 0) {
      basePrice = this.config.minPrice;
    }
    
    // Calculate price change from engagement
    const engagementChange = engagementMetrics.totalEngagement * this.config.engagementMultiplier;
    
    // Apply engagement multiplier
    let newPrice = basePrice * (1 + engagementChange / 100);
    
    // Apply Nautilus external metrics if available
    if (nautilusMetrics.length > 0) {
      const externalMetrics = this.aggregationService.aggregateExternalMetrics(nautilusMetrics);
      const externalBoost = (externalMetrics.popularity_score || 0) / 10000; // Normalize to 0-1
      newPrice = newPrice * (1 + externalBoost * 0.1); // 10% max boost from external
    }
    
    // Check for fallback conditions
    const currentData = this.currentPrices.get(ipTokenId);
    if (currentData) {
      // Check for 50% drop from high
      const high = currentData.ohlc.high;
      if (high > 0 && newPrice < high * (1 - this.config.dropThreshold)) {
        logger.warn(`Price for ${ipTokenId} dropped ${((1 - newPrice / high) * 100).toFixed(2)}% from high, applying fallback`);
        // Keep price at 50% of high (don't let it drop further)
        newPrice = high * (1 - this.config.dropThreshold);
      }
      
      // Check for stagnation (no change for 48 hours)
      const timeSinceUpdate = Date.now() - currentData.timestamp;
      const stagnationHours = timeSinceUpdate / (60 * 60 * 1000);
      
      if (stagnationHours > this.config.stagnationHours) {
        const hoursStagnant = stagnationHours - this.config.stagnationHours;
        const stagnationDrop = hoursStagnant * this.config.stagnationDropRate;
        newPrice = newPrice * (1 - stagnationDrop);
        logger.warn(`Price for ${ipTokenId} stagnant for ${stagnationHours.toFixed(2)} hours, applying ${(stagnationDrop * 100).toFixed(2)}% drop`);
      }
    }
    
    // Ensure minimum price
    newPrice = Math.max(newPrice, this.config.minPrice);
    
    return Math.floor(newPrice);
  }

  /**
   * Get or create OHLC data for a token
   */
  getOrCreateOHLC(ipTokenId, newPrice) {
    const currentData = this.currentPrices.get(ipTokenId);
    
    if (!currentData) {
      // First time, initialize OHLC
      return {
        open: newPrice,
        high: newPrice,
        low: newPrice,
        close: newPrice,
        timestamp: Date.now(),
      };
    }
    
    // Update OHLC
    const ohlc = { ...currentData.ohlc };
    ohlc.close = newPrice;
    ohlc.high = Math.max(ohlc.high, newPrice);
    ohlc.low = Math.min(ohlc.low, newPrice);
    
    // Reset OHLC if it's a new day (optional: can be configured)
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (now - ohlc.timestamp > dayMs) {
      ohlc.open = newPrice;
      ohlc.high = newPrice;
      ohlc.low = newPrice;
      ohlc.timestamp = now;
    }
    
    return ohlc;
  }

  /**
   * Add price point to history
   */
  addToPriceHistory(ipTokenId, pricePoint) {
    if (!this.priceHistory.has(ipTokenId)) {
      this.priceHistory.set(ipTokenId, []);
    }
    
    const history = this.priceHistory.get(ipTokenId);
    history.push(pricePoint);
    
    // Keep only last 1000 points (can be configured)
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Get current price for a token
   */
  getCurrentPrice(ipTokenId) {
    return this.currentPrices.get(ipTokenId) || null;
  }

  /**
   * Get price history for a token
   */
  getPriceHistory(ipTokenId, limit = 100) {
    const history = this.priceHistory.get(ipTokenId) || [];
    return history.slice(-limit);
  }

  /**
   * Get OHLC data for a token
   */
  getOHLC(ipTokenId) {
    const currentData = this.currentPrices.get(ipTokenId);
    return currentData ? currentData.ohlc : null;
  }

  /**
   * Broadcast price updates to all connected clients
   */
  broadcastPriceUpdates() {
    // Ensure we always include ipTokenId in the updates
    const updates = Array.from(this.currentPrices.entries()).map(([ipTokenId, data]) => ({
      ipTokenId: ipTokenId, // Explicitly include ipTokenId
      price: data.price,
      timestamp: data.timestamp,
      ohlc: data.ohlc || {
        open: data.price,
        high: data.price,
        low: data.price,
        close: data.price,
        timestamp: data.timestamp,
      },
    }));
    
    // Only broadcast if we have updates
    if (updates.length === 0) {
      logger.debug('No price updates to broadcast');
      return;
    }
    
    logger.debug(`Broadcasting ${updates.length} price updates`);
    
    // Broadcast to WebSocket connections
    for (const connection of this.connections) {
      try {
        if (connection.readyState === 1) { // WebSocket.OPEN
          connection.send(JSON.stringify({
            type: 'price_update',
            data: updates,
          }));
        }
      } catch (error) {
        logger.error('Error broadcasting to WebSocket connection:', error);
        this.connections.delete(connection);
      }
    }
    
    // Broadcast to SSE connections
    for (const [res, listener] of this.sseConnections.entries()) {
      try {
        listener(updates);
      } catch (error) {
        logger.error('Error broadcasting to SSE connection:', error);
        this.sseConnections.delete(res);
      }
    }
  }

  /**
   * Add WebSocket connection for streaming
   */
  addConnection(ws) {
    this.connections.add(ws);
    logger.info(`Price feed connection added. Total connections: ${this.connections.size}`);
    
    // Send current prices immediately
    const updates = Array.from(this.currentPrices.entries()).map(([ipTokenId, data]) => ({
      ipTokenId,
      price: data.price,
      timestamp: data.timestamp,
      ohlc: data.ohlc,
    }));
    
    ws.send(JSON.stringify({
      type: 'price_update',
      data: updates,
    }));
  }

  /**
   * Remove WebSocket connection
   */
  removeConnection(ws) {
    this.connections.delete(ws);
    logger.info(`Price feed WebSocket connection removed. Total connections: ${this.connections.size}`);
  }

  /**
   * Add SSE connection for streaming
   */
  addSSEConnection(res, listener) {
    this.sseConnections.set(res, listener);
    logger.info(`Price feed SSE connection added. Total SSE connections: ${this.sseConnections.size}`);
  }

  /**
   * Remove SSE connection
   */
  removeSSEConnection(res) {
    this.sseConnections.delete(res);
    logger.info(`Price feed SSE connection removed. Total SSE connections: ${this.sseConnections.size}`);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Price feed configuration updated:', this.config);
  }
}

