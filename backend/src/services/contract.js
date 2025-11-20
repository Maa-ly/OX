import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
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
   * Supports both hex and base64 encoded private keys
   */
  loadAdminKeypair() {
    try {
      const privateKey = process.env.ADMIN_PRIVATE_KEY;
      if (!privateKey) {
        logger.warn('ADMIN_PRIVATE_KEY not set in environment. Contract write operations will fail.');
        return null;
      }

      let privateKeyBytes;
      
      // Try to detect format: hex (64 chars) or base64
      if (privateKey.length === 64 && /^[0-9a-fA-F]+$/.test(privateKey)) {
        // Hex format (64 hex characters = 32 bytes)
        logger.debug('Detected hex format private key');
        privateKeyBytes = Buffer.from(privateKey, 'hex');
      } else {
        // Assume base64 format
        logger.debug('Detected base64 format private key');
        try {
          privateKeyBytes = fromB64(privateKey);
        } catch (b64Error) {
          // If base64 fails, try hex anyway
          logger.warn('Base64 decode failed, trying hex format');
          privateKeyBytes = Buffer.from(privateKey, 'hex');
        }
      }

      if (privateKeyBytes.length !== 32) {
        throw new Error(`Invalid private key length: expected 32 bytes, got ${privateKeyBytes.length}. Key format may be incorrect.`);
      }

      const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
      logger.info('Admin keypair loaded successfully');
      return keypair;
    } catch (error) {
      logger.error('Failed to load admin keypair:', error);
      logger.error('ADMIN_PRIVATE_KEY length:', process.env.ADMIN_PRIVATE_KEY?.length);
      logger.error('ADMIN_PRIVATE_KEY format check:', /^[0-9a-fA-F]+$/.test(process.env.ADMIN_PRIVATE_KEY || ''));
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
      // Primary method: Query the token object directly (most reliable)
      logger.debug(`Querying token object directly: ${tokenId}`);
      try {
        const tokenObject = await this.client.getObject({
          id: tokenId,
          options: {
            showContent: true,
            showType: true,
            showBcs: true,
          },
        });

        if (tokenObject.data?.content?.dataType === 'moveObject') {
          const fields = tokenObject.data.content.fields;
          logger.info('Token object fields:', Object.keys(fields));
          logger.info('Full fields object (first 500 chars):', JSON.stringify(fields).substring(0, 500));
          
          // Extract metadata from the token object
          // IPToken structure: { id, metadata: IPTokenMetadata, total_supply, reserve_pool, circulating_supply, admin }
          // IPTokenMetadata structure: { name, symbol, description, category, created_at }
          let name = 'Unknown';
          let symbol = 'UNK';
          let description = '';
          let category = 0;

          if (fields.metadata) {
            const metadata = fields.metadata;
            
            // Metadata can be nested: fields.metadata.fields.name, or direct: fields.metadata.name
            // Check if metadata has a nested 'fields' structure
            const metadataFields = metadata.fields || metadata;
            
            // Helper function to decode vector<u8> fields (arrays of byte numbers)
            const decodeVectorU8 = (value) => {
              if (!value) return '';
              
              if (Array.isArray(value)) {
                // Array of numbers (bytes) - convert to string
                const bytes = value.filter(b => typeof b === 'number' && b >= 0 && b <= 255);
                if (bytes.length > 0) {
                  try {
                    return String.fromCharCode(...bytes);
                  } catch (e) {
                    logger.warn('Error decoding byte array:', e);
                    return '';
                  }
                }
              } else if (typeof value === 'string') {
                // Try base64 first
                try {
                  const decoded = Buffer.from(value, 'base64').toString('utf-8');
                  if (decoded.length > 0) {
                    return decoded;
                  }
                } catch (e) {
                  // Not base64, return as-is
                  return value;
                }
              }
              
              return '';
            };
            
            // Extract name, symbol, description from metadata
            name = decodeVectorU8(metadataFields.name) || 'Unknown';
            symbol = decodeVectorU8(metadataFields.symbol) || 'UNK';
            description = decodeVectorU8(metadataFields.description) || '';
            
            if (metadataFields.category !== undefined) {
              category = Number(metadataFields.category);
            }
            
            logger.info(`Parsed metadata for ${tokenId} - name: "${name}", symbol: "${symbol}", category: ${category}`);
          } else {
            logger.warn(`No metadata field found in token object ${tokenId}`);
            logger.debug('Available fields:', Object.keys(fields));
          }

          // Extract supply information
          const totalSupply = Number(fields.total_supply || fields.totalSupply || 0);
          const reservePool = Number(fields.reserve_pool || fields.reservePool || 0);
          const circulatingSupply = Number(fields.circulating_supply || fields.circulatingSupply || 0);

          logger.info(`Successfully extracted token info for ${tokenId}: ${name} (${symbol})`);
          
          return {
            name,
            symbol,
            description,
            category,
            totalSupply,
            reservePool,
            circulatingSupply,
          };
        }
      } catch (directError) {
        logger.warn(`Direct object query failed for token ${tokenId}, trying view function:`, directError.message);
      }

      // Fallback method: Use view function
      logger.debug(`Trying view function for token: ${tokenId}`);
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::token::get_token_info`,
        arguments: [tx.object(tokenId)],
      });

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
      // Primary method: Query the TokenRegistry object directly (most reliable)
      logger.info(`Querying TokenRegistry object directly: ${this.tokenRegistryId}`);
      logger.info(`Using Sui RPC: ${config.sui.rpcUrl}`);
      try {
        const registryObject = await this.client.getObject({
          id: this.tokenRegistryId,
          options: {
            showContent: true,
            showType: true,
            showBcs: true,
          },
        });

        logger.info('TokenRegistry object retrieved successfully');
        logger.info('TokenRegistry object type:', registryObject.data?.type);
        logger.info('TokenRegistry content type:', registryObject.data?.content?.dataType);

        if (registryObject.data?.content?.dataType === 'moveObject') {
          const fields = registryObject.data.content.fields;
          logger.info('TokenRegistry fields:', Object.keys(fields));
          logger.info('Tokens field type:', typeof fields.tokens);
          logger.info('Tokens field value (first 200 chars):', JSON.stringify(fields.tokens).substring(0, 200));
          
          // The tokens field is an array of token ID strings
          if (fields.tokens) {
            let tokenIds = [];
            
            // Handle array of token IDs (most common case)
            if (Array.isArray(fields.tokens)) {
              logger.info(`Tokens field is an array with ${fields.tokens.length} items`);
              tokenIds = fields.tokens
                .map(token => {
                  // Token IDs are already strings in format "0x..."
                  if (typeof token === 'string' && token.startsWith('0x')) {
                    return token;
                  }
                  // Handle object references if any
                  if (token && typeof token === 'object' && token.id) {
                    return token.id;
                  }
                  return null;
                })
                .filter(id => id !== null && id.startsWith('0x'));
              
              logger.info(`Parsed ${tokenIds.length} valid token IDs from array`);
              if (tokenIds.length > 0) {
                logger.info(`Successfully retrieved ${tokenIds.length} token ID(s) from TokenRegistry object`);
                logger.info(`Token IDs: ${tokenIds.join(', ')}`);
                return tokenIds;
              } else {
                logger.warn('No valid token IDs found in tokens array');
              }
            } 
            // Try as BCS-encoded string (fallback)
            else if (typeof fields.tokens === 'string') {
              logger.info('Tokens field is a string, attempting to parse as BCS-encoded');
              try {
                // Parse BCS-encoded vector<ID>
                const vectorBytes = Buffer.from(fields.tokens, 'base64');
                let offset = 0;
                
                // Read vector length (uleb128)
                let length = 0;
                let shift = 0;
                while (offset < vectorBytes.length) {
                  const byte = vectorBytes[offset];
                  length |= (byte & 0x7f) << shift;
                  offset++;
                  if ((byte & 0x80) === 0) break;
                  shift += 7;
                  if (shift > 32) break;
                }
                
                // Read each ID (32 bytes each)
                for (let i = 0; i < length && offset + 32 <= vectorBytes.length; i++) {
                  const idBytes = vectorBytes.slice(offset, offset + 32);
                  const idHex = '0x' + idBytes.toString('hex');
                  tokenIds.push(idHex);
                  offset += 32;
                }
                
                if (tokenIds.length > 0) {
                  logger.info(`Successfully retrieved ${tokenIds.length} token ID(s) from BCS-encoded tokens field`);
                  return tokenIds;
                }
              } catch (bcsError) {
                logger.warn('Failed to parse BCS-encoded tokens field:', bcsError);
              }
            }
          } else {
            logger.warn('No tokens field found in TokenRegistry object');
          }
          
          // Try using BCS data if available
          if (registryObject.data?.bcs?.dataType === 'moveObject' && registryObject.data?.bcs?.bcsBytes) {
            logger.info('Attempting to parse BCS bytes from object...');
            // This would require more complex BCS parsing
          }
        } else {
          logger.warn(`TokenRegistry object is not a moveObject, type: ${registryObject.data?.content?.dataType}`);
        }
      } catch (directError) {
        logger.error('Direct object query failed:', directError);
        logger.error('Error details:', {
          message: directError.message,
          stack: directError.stack,
          tokenRegistryId: this.tokenRegistryId,
        });
      }

      // Fallback method: Use devInspectTransactionBlock to call the view function
      logger.info('Trying view function method...');
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
          const returnValue = result.results[0].returnValues[0];
          const [returnType, bcsData] = returnValue;
          
          logger.debug(`Return type: ${returnType}, BCS data length: ${bcsData.length}`);
          
          // Parse BCS-encoded vector<ID>
          const vectorBytes = Buffer.from(bcsData, 'base64');
          const tokenIds = [];
          let offset = 0;
          
          // Read vector length (uleb128)
          let length = 0;
          let shift = 0;
          while (offset < vectorBytes.length) {
            const byte = vectorBytes[offset];
            length |= (byte & 0x7f) << shift;
            offset++;
            if ((byte & 0x80) === 0) break;
            shift += 7;
            if (shift > 32) break;
          }
          
          logger.debug(`Parsed vector length: ${length}, remaining bytes: ${vectorBytes.length - offset}`);
          
          // Read each ID (32 bytes each)
          for (let i = 0; i < length && offset + 32 <= vectorBytes.length; i++) {
            const idBytes = vectorBytes.slice(offset, offset + 32);
            const idHex = '0x' + idBytes.toString('hex');
            tokenIds.push(idHex);
            offset += 32;
          }
          
          if (tokenIds.length > 0) {
            logger.info(`Successfully retrieved ${tokenIds.length} token ID(s) from view function`);
            logger.debug(`Token IDs: ${tokenIds.join(', ')}`);
            return tokenIds;
          }
        }
      } catch (viewError) {
        logger.warn('View function method also failed:', viewError);
      }

      logger.warn('All methods failed to retrieve tokens from registry');
      return [];
    } catch (error) {
      logger.error('Error getting all tokens:', error);
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        tokenRegistryId: this.tokenRegistryId,
        packageId: this.packageId,
      });
      throw new Error(`Failed to get all tokens: ${error.message}`);
    }
  }

  /**
   * Get token count from registry
   * @returns {Promise<number>} Number of tokens in registry
   */
  async getTokenCount() {
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::token::get_token_count`,
        arguments: [tx.object(this.tokenRegistryId)],
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
      logger.error('Error getting token count:', error);
      throw new Error(`Failed to get token count: ${error.message}`);
    }
  }

  /**
   * Get all tokens with full information
   * @returns {Promise<Array<Object>>} Array of token objects with full details
   */
  async getAllTokensWithInfo() {
    try {
      const tokenIds = await this.getAllTokens();
      const tokensWithInfo = [];

      // Fetch info for each token
      for (const tokenId of tokenIds) {
        try {
          // Try to get token info via view function first
          let info;
          try {
            info = await this.getTokenInfo(tokenId);
          } catch (viewError) {
            logger.warn(`View function failed for token ${tokenId}, trying direct object query:`, viewError.message);
            
            // Fallback: Query the token object directly
            try {
              const tokenObject = await this.client.getObject({
                id: tokenId,
                options: {
                  showContent: true,
                  showType: true,
                },
              });

              if (tokenObject.data?.content?.dataType === 'moveObject') {
                const fields = tokenObject.data.content.fields;
                // Try to extract metadata from the token object
                // The structure depends on how IPToken is defined in the contract
                if (fields.metadata) {
                  const metadata = fields.metadata;
                  info = {
                    name: metadata.name || fields.name || 'Unknown',
                    symbol: metadata.symbol || fields.symbol || 'UNK',
                    totalSupply: Number(fields.total_supply || fields.totalSupply || 0),
                    reservePool: Number(fields.reserve_pool || fields.reservePool || 0),
                    circulatingSupply: Number(fields.circulating_supply || fields.circulatingSupply || 0),
                  };
                } else {
                  // If no metadata field, try to get from fields directly
                  info = {
                    name: fields.name || 'Unknown',
                    symbol: fields.symbol || 'UNK',
                    totalSupply: Number(fields.total_supply || fields.totalSupply || 0),
                    reservePool: Number(fields.reserve_pool || fields.reservePool || 0),
                    circulatingSupply: Number(fields.circulating_supply || fields.circulatingSupply || 0),
                  };
                }
              } else {
                throw new Error('Token object is not a moveObject');
              }
            } catch (objectError) {
              logger.error(`Direct object query also failed for token ${tokenId}:`, objectError.message);
              throw viewError; // Re-throw original error
            }
          }

          tokensWithInfo.push({
            id: tokenId,
            ...info,
          });
        } catch (error) {
          logger.warn(`Failed to get info for token ${tokenId}:`, error.message);
          // Continue with other tokens even if one fails, but include the ID
          tokensWithInfo.push({
            id: tokenId,
            name: 'Unknown',
            symbol: 'UNK',
            totalSupply: 0,
            reservePool: 0,
            circulatingSupply: 0,
            error: 'Failed to fetch token info',
          });
        }
      }

      return tokensWithInfo;
    } catch (error) {
      logger.error('Error getting all tokens with info:', error);
      throw new Error(`Failed to get all tokens with info: ${error.message}`);
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

