import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Comprehensive Contract Service
 * Handles all interactions with the ODX smart contract
 */
export class ContractService {
  constructor() {
    this.client = new SuiClient({ url: config.sui.rpcUrl });
    this.packageId = config.oracle.packageId;
    
    // Object IDs
    this.oracleObjectId = config.oracle.objectId;
    this.oracleAdminCapId = config.oracle.oracleAdminCapId;
    this.marketplaceObjectId = config.marketplace.objectId;
    this.tokenRegistryId = config.token.registryId;
    this.adminCapId = config.token.adminCapId;
    this.rewardsRegistryId = config.rewards.registryId;
    this.rewardConfigId = config.rewards.configId;
    this.priceOracleId = config.priceOracle.objectId;

    // Load admin keypair from environment
    this.adminKeypair = this.loadAdminKeypair();
  }

  /**
   * Load admin keypair from environment variable
   * Expects ADMIN_PRIVATE_KEY as base64 encoded private key
   */
  loadAdminKeypair() {
    try {
      const privateKeyBase64 = process.env.ADMIN_PRIVATE_KEY;
      if (!privateKeyBase64) {
        logger.warn('ADMIN_PRIVATE_KEY not set in environment. Contract write operations will fail.');
        return null;
      }

      const privateKeyBytes = fromB64(privateKeyBase64);
      const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
      logger.info('Admin keypair loaded successfully');
      return keypair;
    } catch (error) {
      logger.error('Failed to load admin keypair:', error);
      return null;
    }
  }

  /**
   * Ensure admin keypair is available
   */
  ensureAdminKeypair() {
    if (!this.adminKeypair) {
      throw new Error('Admin keypair not configured. Set ADMIN_PRIVATE_KEY in .env');
    }
    return this.adminKeypair;
  }

  // ============================================================================
  // TOKEN MODULE FUNCTIONS
  // ============================================================================

  /**
   * Create a new IP token
   * @param {Object} params - Token creation parameters
   * @param {string} params.name - Token name
   * @param {string} params.symbol - Token symbol
   * @param {string} params.description - Token description
   * @param {number} params.category - Category (0=anime, 1=manga, 2=manhwa)
   * @param {number} params.reservePoolSize - Reserve pool size
   * @returns {Promise<Object>} Transaction result with created token ID
   */
  async createIPToken({ name, symbol, description, category, reservePoolSize }) {
    try {
      const keypair = this.ensureAdminKeypair();

      logger.info(`Creating IP token: ${name} (${symbol})`);

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::token::create_ip_token`,
        arguments: [
          tx.object(this.adminCapId),
          tx.object(this.tokenRegistryId),
          tx.pure.string(name),
          tx.pure.string(symbol),
          tx.pure.string(description),
          tx.pure.u8(category),
          tx.pure.u64(reservePoolSize),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      // Extract created token ID from object changes
      const createdToken = result.objectChanges?.find(
        (change) => change.type === 'created' && change.objectType?.includes('IPToken')
      );

      logger.info('IP token created successfully:', result.digest);
      return {
        digest: result.digest,
        tokenId: createdToken?.objectId,
        result,
      };
    } catch (error) {
      logger.error('Error creating IP token:', error);
      throw new Error(`Failed to create IP token: ${error.message}`);
    }
  }

  /**
   * Get token information
   * @param {string} tokenId - IP token ID
   * @returns {Promise<Object>} Token information
   */
  async getTokenInfo(tokenId) {
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::token::get_token_info`,
        arguments: [tx.object(tokenId)],
      });

      // For view functions, we need to use devInspectTransaction
      const result = await this.client.devInspectTransactionBlock({
        sender: this.adminKeypair?.toSuiAddress() || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
      });

      if (result.results?.[0]?.returnValues) {
        const returnValues = result.results[0].returnValues;
        // Parse return values (name, symbol, total_supply, reserve_pool, circulating_supply)
        return {
          name: Buffer.from(returnValues[0][1], 'base64').toString(),
          symbol: Buffer.from(returnValues[1][1], 'base64').toString(),
          totalSupply: this.parseU64(returnValues[2][1]),
          reservePool: this.parseU64(returnValues[3][1]),
          circulatingSupply: this.parseU64(returnValues[4][1]),
        };
      }

      throw new Error('No return values from get_token_info');
    } catch (error) {
      logger.error('Error getting token info:', error);
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  /**
   * Update reserve pool size
   * @param {string} tokenId - IP token ID
   * @param {number} newReserveSize - New reserve pool size
   * @returns {Promise<Object>} Transaction result
   */
  async updateReservePool(tokenId, newReserveSize) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::token::update_reserve_pool`,
        arguments: [
          tx.object(this.adminCapId),
          tx.object(tokenId),
          tx.pure.u64(newReserveSize),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
        },
      });

      logger.info('Reserve pool updated:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error updating reserve pool:', error);
      throw new Error(`Failed to update reserve pool: ${error.message}`);
    }
  }

  /**
   * Get all tokens from registry
   * @returns {Promise<Array<string>>} Array of token IDs
   */
  async getAllTokens() {
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::token::get_all_tokens`,
        arguments: [tx.object(this.tokenRegistryId)],
      });

      const result = await this.client.devInspectTransactionBlock({
        sender: this.adminKeypair?.toSuiAddress() || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
      });

      if (result.results?.[0]?.returnValues) {
        // Parse vector of IDs
        const returnValue = result.results[0].returnValues[0][1];
        // This would need proper deserialization of Move vector
        // For now, return raw value
        return returnValue;
      }

      return [];
    } catch (error) {
      logger.error('Error getting all tokens:', error);
      throw new Error(`Failed to get all tokens: ${error.message}`);
    }
  }

  // ============================================================================
  // MARKETPLACE MODULE FUNCTIONS
  // ============================================================================

  /**
   * Create a buy order
   * @param {Object} params - Buy order parameters
   * @param {string} params.ipTokenId - IP token ID
   * @param {number} params.price - Price per token (scaled by 1e9)
   * @param {number} params.quantity - Quantity to buy
   * @param {string} params.paymentCoinId - Payment coin object ID
   * @returns {Promise<Object>} Transaction result with order ID
   */
  async createBuyOrder({ ipTokenId, price, quantity, paymentCoinId }) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::marketplace::create_buy_order`,
        arguments: [
          tx.object(this.marketplaceObjectId),
          tx.pure.id(ipTokenId),
          tx.pure.u64(price),
          tx.pure.u64(quantity),
          tx.object(paymentCoinId),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      const createdOrder = result.objectChanges?.find(
        (change) => change.type === 'created' && change.objectType?.includes('MarketOrder')
      );

      logger.info('Buy order created:', result.digest);
      return {
        digest: result.digest,
        orderId: createdOrder?.objectId,
        result,
      };
    } catch (error) {
      logger.error('Error creating buy order:', error);
      throw new Error(`Failed to create buy order: ${error.message}`);
    }
  }

  /**
   * Create a sell order
   * @param {Object} params - Sell order parameters
   * @param {string} params.ipTokenId - IP token ID
   * @param {number} params.price - Price per token (scaled by 1e9)
   * @param {number} params.quantity - Quantity to sell
   * @returns {Promise<Object>} Transaction result with order ID
   */
  async createSellOrder({ ipTokenId, price, quantity }) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::marketplace::create_sell_order`,
        arguments: [
          tx.object(this.marketplaceObjectId),
          tx.pure.id(ipTokenId),
          tx.pure.u64(price),
          tx.pure.u64(quantity),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      const createdOrder = result.objectChanges?.find(
        (change) => change.type === 'created' && change.objectType?.includes('MarketOrder')
      );

      logger.info('Sell order created:', result.digest);
      return {
        digest: result.digest,
        orderId: createdOrder?.objectId,
        result,
      };
    } catch (error) {
      logger.error('Error creating sell order:', error);
      throw new Error(`Failed to create sell order: ${error.message}`);
    }
  }

  /**
   * Execute a buy order
   * @param {string} orderId - Buy order ID
   * @returns {Promise<Object>} Transaction result
   */
  async executeBuyOrder(orderId) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::marketplace::execute_buy_order`,
        arguments: [
          tx.object(this.marketplaceObjectId),
          tx.object(orderId),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
        },
      });

      logger.info('Buy order executed:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error executing buy order:', error);
      throw new Error(`Failed to execute buy order: ${error.message}`);
    }
  }

  /**
   * Execute a sell order
   * @param {string} orderId - Sell order ID
   * @returns {Promise<Object>} Transaction result
   */
  async executeSellOrder(orderId) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::marketplace::execute_sell_order`,
        arguments: [
          tx.object(this.marketplaceObjectId),
          tx.object(orderId),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
        },
      });

      logger.info('Sell order executed:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error executing sell order:', error);
      throw new Error(`Failed to execute sell order: ${error.message}`);
    }
  }

  /**
   * Cancel an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Transaction result
   */
  async cancelOrder(orderId) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::marketplace::cancel_order`,
        arguments: [
          tx.object(this.marketplaceObjectId),
          tx.object(orderId),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
        },
      });

      logger.info('Order cancelled:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  // ============================================================================
  // ORACLE MODULE FUNCTIONS
  // ============================================================================

  /**
   * Initialize price data for a new IP token
   * @param {string} ipTokenId - IP token ID
   * @param {number} basePrice - Base price in SUI (scaled by 1e9)
   * @returns {Promise<Object>} Transaction result
   */
  async initializeTokenPrice(ipTokenId, basePrice) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::oracle::initialize_token_price`,
        arguments: [
          tx.object(this.oracleObjectId),
          tx.pure.id(ipTokenId),
          tx.pure.u64(basePrice),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
        },
      });

      logger.info('Token price initialized:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error initializing token price:', error);
      throw new Error(`Failed to initialize token price: ${error.message}`);
    }
  }

  /**
   * Update engagement metrics
   * @param {Object} params - Metrics parameters
   * @param {string} params.ipTokenId - IP token ID
   * @param {number} params.averageRating - Average rating (scaled by 100)
   * @param {number} params.totalContributors - Total contributors
   * @param {number} params.totalEngagements - Total engagements
   * @param {number} params.predictionAccuracy - Prediction accuracy (0-10000)
   * @param {number} params.growthRate - Growth rate (scaled by 100)
   * @returns {Promise<Object>} Transaction result
   */
  async updateEngagementMetrics({
    ipTokenId,
    averageRating,
    totalContributors,
    totalEngagements,
    predictionAccuracy,
    growthRate,
  }) {
    try {
      const keypair = this.ensureAdminKeypair();

      logger.info(`Updating engagement metrics for token: ${ipTokenId}`);

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::oracle::update_engagement_metrics`,
        arguments: [
          tx.object(this.oracleObjectId),
          tx.object(this.oracleAdminCapId),
          tx.pure.id(ipTokenId),
          tx.pure.u64(averageRating),
          tx.pure.u64(totalContributors),
          tx.pure.u64(totalEngagements),
          tx.pure.u64(predictionAccuracy),
          tx.pure.u64(growthRate),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      logger.info('Engagement metrics updated:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error updating engagement metrics:', error);
      throw new Error(`Failed to update engagement metrics: ${error.message}`);
    }
  }

  /**
   * Get current price for an IP token
   * @param {string} ipTokenId - IP token ID
   * @returns {Promise<number|null>} Current price or null
   */
  async getPrice(ipTokenId) {
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::oracle::get_price`,
        arguments: [
          tx.object(this.oracleObjectId),
          tx.pure.id(ipTokenId),
        ],
      });

      const result = await this.client.devInspectTransactionBlock({
        sender: this.adminKeypair?.toSuiAddress() || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
      });

      if (result.results?.[0]?.returnValues) {
        const returnValue = result.results[0].returnValues[0];
        // Check if Option::some or Option::none
        if (returnValue[0] === 0) {
          // Option::none
          return null;
        }
        // Option::some - parse u64
        return this.parseU64(returnValue[1]);
      }

      return null;
    } catch (error) {
      logger.error('Error getting price:', error);
      throw new Error(`Failed to get price: ${error.message}`);
    }
  }

  /**
   * Get engagement metrics for an IP token
   * @param {string} ipTokenId - IP token ID
   * @returns {Promise<Object|null>} Engagement metrics or null
   */
  async getEngagementMetrics(ipTokenId) {
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::oracle::get_engagement_metrics`,
        arguments: [
          tx.object(this.oracleObjectId),
          tx.pure.id(ipTokenId),
        ],
      });

      const result = await this.client.devInspectTransactionBlock({
        sender: this.adminKeypair?.toSuiAddress() || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
      });

      if (result.results?.[0]?.returnValues) {
        const returnValue = result.results[0].returnValues[0];
        if (returnValue[0] === 0) {
          return null;
        }
        // Parse EngagementMetrics struct
        // This would need proper deserialization
        return returnValue[1];
      }

      return null;
    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      throw new Error(`Failed to get engagement metrics: ${error.message}`);
    }
  }

  /**
   * Recalculate price for an IP token
   * @param {string} ipTokenId - IP token ID
   * @returns {Promise<Object>} Transaction result
   */
  async recalculatePrice(ipTokenId) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::oracle::recalculate_price`,
        arguments: [
          tx.object(this.oracleObjectId),
          tx.pure.id(ipTokenId),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
        },
      });

      logger.info('Price recalculated:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error recalculating price:', error);
      throw new Error(`Failed to recalculate price: ${error.message}`);
    }
  }

  // ============================================================================
  // REWARDS MODULE FUNCTIONS
  // ============================================================================

  /**
   * Register engagement
   * @param {Object} params - Engagement parameters
   * @param {string} params.ipTokenId - IP token ID
   * @param {string} params.userAddress - User address
   * @param {number} params.rating - Rating (0-10)
   * @param {number} params.engagementType - Engagement type
   * @returns {Promise<Object>} Transaction result
   */
  async registerEngagement({ ipTokenId, userAddress, rating, engagementType }) {
    try {
      const keypair = this.ensureAdminKeypair();

      // First, we need to create EngagementData
      // This is a simplified version - actual implementation would need proper struct creation
      const tx = new Transaction();
      
      // Note: This would need to be implemented based on how EngagementData is created
      // For now, this is a placeholder
      logger.warn('registerEngagement needs proper EngagementData struct creation');

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
        },
      });

      logger.info('Engagement registered:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error registering engagement:', error);
      throw new Error(`Failed to register engagement: ${error.message}`);
    }
  }

  /**
   * Distribute reward to contributor
   * @param {Object} params - Reward parameters
   * @param {string} params.ipTokenId - IP token ID
   * @param {string} params.userAddress - User address
   * @param {number} params.reason - Reward reason (0-3)
   * @returns {Promise<Object>} Transaction result
   */
  async distributeReward({ ipTokenId, userAddress, reason }) {
    try {
      const keypair = this.ensureAdminKeypair();

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::rewards::distribute_reward`,
        arguments: [
          tx.object(this.rewardsRegistryId),
          tx.object(this.rewardConfigId),
          tx.object(ipTokenId), // IPToken object
          tx.pure.address(userAddress),
          tx.pure.u8(reason),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
        },
      });

      logger.info('Reward distributed:', result.digest);
      return { digest: result.digest, result };
    } catch (error) {
      logger.error('Error distributing reward:', error);
      throw new Error(`Failed to distribute reward: ${error.message}`);
    }
  }

  /**
   * Get contributor record
   * @param {string} ipTokenId - IP token ID
   * @param {string} userAddress - User address
   * @returns {Promise<Object|null>} Contributor record or null
   */
  async getContributor(ipTokenId, userAddress) {
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::rewards::get_contributor`,
        arguments: [
          tx.object(this.rewardsRegistryId),
          tx.pure.id(ipTokenId),
          tx.pure.address(userAddress),
        ],
      });

      const result = await this.client.devInspectTransactionBlock({
        sender: this.adminKeypair?.toSuiAddress() || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
      });

      if (result.results?.[0]?.returnValues) {
        const returnValue = result.results[0].returnValues[0];
        if (returnValue[0] === 0) {
          return null;
        }
        // Parse ContributorRecord struct
        return returnValue[1];
      }

      return null;
    } catch (error) {
      logger.error('Error getting contributor:', error);
      throw new Error(`Failed to get contributor: ${error.message}`);
    }
  }

  /**
   * Get contributor count for an IP token
   * @param {string} ipTokenId - IP token ID
   * @returns {Promise<number>} Contributor count
   */
  async getContributorCount(ipTokenId) {
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::rewards::get_contributor_count`,
        arguments: [
          tx.object(this.rewardsRegistryId),
          tx.pure.id(ipTokenId),
        ],
      });

      const result = await this.client.devInspectTransactionBlock({
        sender: this.adminKeypair?.toSuiAddress() || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
      });

      if (result.results?.[0]?.returnValues) {
        return this.parseU64(result.results[0].returnValues[0][1]);
      }

      return 0;
    } catch (error) {
      logger.error('Error getting contributor count:', error);
      throw new Error(`Failed to get contributor count: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Parse u64 from base64 encoded value
   */
  parseU64(base64Value) {
    try {
      const buffer = Buffer.from(base64Value, 'base64');
      // Sui uses little-endian u64
      let value = 0n;
      for (let i = 0; i < 8; i++) {
        value |= BigInt(buffer[i]) << BigInt(i * 8);
      }
      return Number(value);
    } catch (error) {
      logger.error('Error parsing u64:', error);
      return 0;
    }
  }

  /**
   * Get object details from Sui
   * @param {string} objectId - Object ID
   * @returns {Promise<Object>} Object details
   */
  async getObject(objectId) {
    try {
      return await this.client.getObject({
        id: objectId,
        options: {
          showContent: true,
          showType: true,
          showOwner: true,
        },
      });
    } catch (error) {
      logger.error('Error getting object:', error);
      throw new Error(`Failed to get object: ${error.message}`);
    }
  }
}

// Export singleton instance
export const contractService = new ContractService();

