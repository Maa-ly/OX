import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

const execAsync = promisify(exec);

/**
 * Walrus Service
 * 
 * Implements Walrus operations using HTTP API (primary) or CLI (fallback)
 * 
 * Reference: https://docs.wal.app/usage/interacting.html
 * - HTTP API: https://docs.wal.app/usage/web-api.html
 * - JSON API: https://docs.wal.app/usage/json-api.html
 * - CLI: https://docs.wal.app/usage/client-cli.html
 * 
 * Configuration (hardcoded defaults):
 * - Publisher URL: https://publisher.walrus-testnet.walrus.space (for storing blobs)
 * - Aggregator URL: https://aggregator.walrus-testnet.walrus.space (for reading blobs)
 * - Context: testnet
 * 
 * Testnet Setup & Getting WAL Tokens:
 * 1. Get Testnet SUI tokens from the Sui Testnet faucet: sui client faucet
 * 2. Exchange SUI for WAL tokens using: walrus get-wal (1:1 exchange rate)
 * 3. Verify WAL balance with: sui client gas (shows all coins including WAL)
 * Documentation: https://docs.wal.app/usage/networks.html
 * 
 * Supports:
 * - HTTP API (primary method, works in serverless environments)
 *   - For production: HTTP API must work - no CLI fallback available in serverless
 *   - Public testnet publisher may have limitations (WAL balance, wallet configuration)
 *   - For production: Consider running your own Walrus publisher or using a different storage solution
 * - CLI commands (fallback for local development only)
 *   - CLI will NOT work in production/serverless environments (no binary access, no file system)
 * 
 * Production Considerations:
 * - The public testnet publisher (https://publisher.walrus-testnet.walrus.space) may not support
 *   client wallet addresses or may have limited WAL token balance
 * - For production deployments, consider:
 *   1. Running your own Walrus publisher/aggregator (requires infrastructure)
 *   2. Using a different storage solution
 *   3. Verifying the public publisher has sufficient WAL tokens
 * 
 * Error Handling:
 * - Provides helpful error messages for common issues (e.g., insufficient WAL balance)
 * - Includes documentation links in error messages
 * - CLI fallback only available in non-serverless environments
 */
export class WalrusService {
  constructor() {
    // HTTP API configuration (primary method)
    // Reference: https://docs.wal.app/usage/web-api.html
    this.useHttpApi = config.walrus.useHttpApi;
    this.aggregatorUrl = config.walrus.aggregatorUrl; // For reading blobs
    this.publisherUrl = config.walrus.publisherUrl; // For storing blobs
    
    // Log configuration for debugging
    logger.info('WalrusService configuration:', {
      useHttpApi: this.useHttpApi,
      aggregatorUrl: this.aggregatorUrl,
      publisherUrl: this.publisherUrl,
      walletAddress: this.walletAddress || 'Not configured (will use Walrus config file wallet)',
      walletConfigured: !!this.walletKeypair,
    });
    
    // CLI configuration (fallback)
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.walrusPath = '~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus';
    this.walrusPath = this.walrusPath.replace('~', homeDir);
    this.configPath = config.walrus.configPath.replace('~', homeDir);
    this.context = config.walrus.context;
    
    // Sui client for reading blob metadata and checking balances
    this.suiClient = new SuiClient({ url: config.sui.rpcUrl });
    
    // Wallet for funding user posts (reuse admin keypair if available)
    this.walletKeypair = this.loadWalletKeypair();
    this.walletAddress = this.walletKeypair ? this.walletKeypair.toSuiAddress() : null;
    
    // Log wallet info for debugging
    if (this.walletAddress) {
      logger.info(`WalrusService wallet configured: ${this.walletAddress}`);
      logger.info(`This wallet will be used for HTTP API requests (via query params/headers) and CLI operations`);
    } else {
      logger.warn('No wallet configured in WalrusService. HTTP API may fail if wallet address is required.');
    }
    
    // Metrics collector (set externally)
    this.metricsCollector = null;
    
    // Log which method we're using
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !process.env.HOME;
    if (this.useHttpApi && this.publisherUrl && this.aggregatorUrl) {
      logger.info(`WalrusService: Using HTTP API - Publisher: ${this.publisherUrl}, Aggregator: ${this.aggregatorUrl}`);
      if (isServerless) {
        logger.info('WalrusService: Running in serverless environment - HTTP API is required');
      }
    } else {
      if (isServerless) {
        logger.error('WalrusService: HTTP API not configured but running in serverless environment! This will fail.');
      } else {
        logger.info('WalrusService: Using CLI (HTTP API not fully configured)');
      }
    }
  }

  /**
   * Load wallet keypair for funding user posts
   * Reuses ADMIN_PRIVATE_KEY if available
   */
  loadWalletKeypair() {
    try {
      const privateKey = process.env.ADMIN_PRIVATE_KEY;
      if (!privateKey) {
        logger.warn('ADMIN_PRIVATE_KEY not set. Walrus operations may fail if WAL tokens are required. The service will use the wallet from Walrus config file if available.');
        return null;
      }

      let privateKeyBytes;
      
      // Try to detect format: hex (64 chars) or base64
      if (privateKey.length === 64 && /^[0-9a-fA-F]+$/.test(privateKey)) {
        // Hex format (64 hex characters = 32 bytes)
        privateKeyBytes = Buffer.from(privateKey, 'hex');
      } else {
        // Assume base64 format
        try {
          privateKeyBytes = fromB64(privateKey);
        } catch (b64Error) {
          // If base64 fails, try hex anyway
          privateKeyBytes = Buffer.from(privateKey, 'hex');
        }
      }

      if (privateKeyBytes.length !== 32) {
        logger.warn(`Invalid private key length: expected 32 bytes, got ${privateKeyBytes.length}. Wallet funding may not work.`);
        return null;
      }

      const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
      const address = keypair.toSuiAddress();
      logger.info(`WalrusService wallet loaded: ${address}`);
      return keypair;
    } catch (error) {
      logger.warn('Failed to load wallet keypair for Walrus:', error.message);
      return null;
    }
  }

  /**
   * Check WAL token balance for the configured wallet
   * 
   * @returns {Promise<Object>} Balance information including WAL balance
   */
  async checkWALBalance() {
    if (!this.walletAddress) {
      logger.warn('No wallet address configured for WAL balance check');
      return { walBalance: 0, suiBalance: 0, hasWAL: false, details: {} };
    }

    try {
      // Get all coins for the wallet
      const allCoins = await this.suiClient.getAllCoins({
        owner: this.walletAddress,
      });

      // Check SUI balance
      const suiBalance = await this.suiClient.getBalance({
        owner: this.walletAddress,
      });
      
      let walBalance = 0;
      let walCoinType = null;
      const coinTypes = new Set();
      
      // Look for WAL tokens - check all coin types
      // WAL tokens on testnet might have a specific type identifier
      for (const coin of allCoins.data) {
        coinTypes.add(coin.coinType);
        
        // Check if this coin type might be WAL
        // WAL tokens might be identified by type containing "wal" or a specific package ID
        if (coin.coinType.toLowerCase().includes('wal') || 
            coin.coinType.includes('WAL') ||
            coin.coinType !== '0x2::sui::SUI') {
          // Try to get balance for this coin type
          try {
            const balance = await this.suiClient.getBalance({
              owner: this.walletAddress,
              coinType: coin.coinType,
            });
            
            if (balance.totalBalance && balance.totalBalance > 0) {
              // This might be WAL - log it
              logger.debug(`Found potential WAL token: ${coin.coinType}, balance: ${balance.totalBalance} MIST`);
              
              // If it's not SUI, assume it might be WAL (or another token)
              if (coin.coinType !== '0x2::sui::SUI') {
                walBalance += parseInt(balance.totalBalance);
                if (!walCoinType) {
                  walCoinType = coin.coinType;
                }
              }
            }
          } catch (err) {
            // Ignore errors for individual coin types
          }
        }
      }
      
      const hasWAL = walBalance > 0;
      
      // Log summary
      logger.info(`Wallet ${this.walletAddress} balance check:`, {
        suiBalance: `${parseInt(suiBalance.totalBalance) / 1e9} SUI (${suiBalance.totalBalance} MIST)`,
        walBalance: `${walBalance / 1e9} WAL (${walBalance} MIST)`,
        hasWAL,
        coinTypesFound: Array.from(coinTypes).length,
        walCoinType: walCoinType || 'Not found - may need manual verification',
      });
      
      if (!hasWAL) {
        logger.warn(`Wallet ${this.walletAddress} does not appear to have WAL tokens. ` +
          `Found ${coinTypes.size} coin type(s): ${Array.from(coinTypes).join(', ')}. ` +
          `Run 'walrus get-wal' with the same wallet to get WAL tokens.`);
      }
      
      return {
        walBalance,
        suiBalance: parseInt(suiBalance.totalBalance),
        hasWAL,
        walletAddress: this.walletAddress,
        coinTypes: Array.from(coinTypes),
        walCoinType: walCoinType || null,
      };
    } catch (error) {
      logger.error('Failed to check WAL balance:', error);
      return { 
        walBalance: 0, 
        suiBalance: 0, 
        hasWAL: false, 
        error: error.message,
        walletAddress: this.walletAddress,
      };
    }
  }

  /**
   * Set metrics collector (called by service that instantiates this)
   */
  setMetricsCollector(collector) {
    this.metricsCollector = collector;
  }

  /**
   * Execute HTTP request to Walrus aggregator
   * 
   * Reference: https://docs.wal.app/usage/web-api.html
   * 
   * Note: To find the aggregator URL for your network:
   * - Check Walrus documentation for public aggregators
   * - Or run: walrus info (CLI) to get system info
   * - Or check your Walrus config file
   * 
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options (body, headers, etc.)
   * @returns {Promise<Response>} HTTP response
   */
  async executeHttpRequest(method, endpoint, options = {}) {
    if (!this.aggregatorUrl) {
      throw new Error('Walrus aggregator URL not configured.');
    }

    const url = `${this.aggregatorUrl.replace(/\/$/, '')}${endpoint}`;
    logger.debug(`Walrus HTTP ${method} ${url}`);

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body) {
      if (Buffer.isBuffer(options.body)) {
        fetchOptions.body = options.body;
        fetchOptions.headers['Content-Type'] = 'application/octet-stream';
      } else if (typeof options.body === 'string') {
        fetchOptions.body = options.body;
      } else {
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Walrus HTTP API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Return ArrayBuffer for binary data
        return await response.arrayBuffer();
      }
    } catch (error) {
      logger.error(`Walrus HTTP request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute Walrus CLI command (fallback method)
   * 
   * Reference: https://docs.wal.app/usage/interacting.html#using-the-client-cli
   * 
   * @param {string} command - Command to execute (without 'walrus' prefix)
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command result
   */
  async executeWalrusCommand(command, options = {}) {
    try {
      const args = [
        '--config', this.configPath,
        '--context', this.context,
      ];

      // Add --json flag for JSON output if requested
      if (options.json) {
        args.push('--json');
      }

      // Add command arguments
      args.push(...command.split(' ').filter(Boolean));

      const fullCommand = `${this.walrusPath} ${args.join(' ')}`;
      logger.debug(`Executing Walrus command: ${fullCommand}`);

      const { stdout, stderr } = await execAsync(fullCommand, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: options.timeout || 60000, // 60 second default timeout
      });

      if (stderr && !options.ignoreStderr) {
        logger.warn('Walrus command stderr:', stderr);
      }

      // Try to parse JSON output if --json was used
      if (options.json) {
        try {
          return JSON.parse(stdout);
        } catch (e) {
          logger.warn('Failed to parse JSON output:', e.message);
          return { output: stdout, raw: true };
        }
      }

      return { output: stdout, raw: true };
    } catch (error) {
      logger.error('Walrus command failed:', error);
      // Include stderr in error message if available
      const errorMsg = error.stderr ? `${error.message}\n${error.stderr}` : error.message;
      throw new Error(`Walrus command failed: ${errorMsg}`);
    }
  }

  /**
   * Execute Walrus command in JSON mode
   * 
   * Reference: https://docs.wal.app/usage/json-api
   * 
   * This is an alternative way to execute commands using structured JSON
   * Example: walrus json '{ "config": "...", "command": {...} }'
   * 
   * @param {Object} commandObj - Command object in JSON format
   * @returns {Promise<Object>} Command result
   */
  async executeWalrusJSON(commandObj) {
    try {
      const jsonCommand = JSON.stringify({
        config: this.configPath,
        context: this.context,
        ...commandObj,
      });

      // Use echo to pipe JSON to walrus json command
      const fullCommand = `echo '${jsonCommand.replace(/'/g, "'\\''")}' | ${this.walrusPath} json`;
      logger.debug(`Executing Walrus JSON command`);

      const { stdout, stderr } = await execAsync(fullCommand, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000,
        shell: true, // Need shell for pipe
      });

      if (stderr) {
        logger.warn('Walrus JSON command stderr:', stderr);
      }

      return JSON.parse(stdout);
    } catch (error) {
      logger.error('Walrus JSON command failed:', error);
      throw new Error(`Walrus JSON command failed: ${error.message}`);
    }
  }

  /**
   * Store a blob on Walrus
   * 
   * Operation: Store
   * Reference: https://docs.wal.app/dev-guide/dev-operations.html#store
   * HTTP API: PUT $PUBLISHER/v1/blobs?epochs=N&permanent=true
   *   - Body: Raw binary data
   *   - Query params: epochs (number), permanent (bool) or deletable (bool)
   * CLI: walrus store <file> [--deletable] [--epochs <n>]
   * 
   * Note: Requires WAL tokens in your account for testnet operations.
   * Get WAL tokens: 1) Get Testnet SUI from faucet, 2) Exchange using 'walrus get-wal'
   * Docs: https://docs.wal.app/usage/networks.html
   * 
   * @param {Buffer|string} data - Data to store
   * @param {Object} options - Storage options
   *   - epochs: Number of epochs to store (default: 365)
   *   - permanent: If true, blob cannot be deleted (default: true if deletable is false)
   *   - deletable: If true, blob can be deleted (mutually exclusive with permanent)
   * @returns {Promise<Object>} Blob information with blob ID
   */
  async storeBlob(data, options = {}) {
    const startTime = Date.now();

    try {
      logger.info('Storing blob on Walrus...');
      
      // Convert data to buffer if string (needed for size calculation)
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
      
      // Check wallet balance before storing
      if (this.walletAddress) {
        logger.info(`Using wallet for funding: ${this.walletAddress}`);
        
        try {
          const balanceInfo = await this.checkWALBalance();
          
          if (!balanceInfo.hasWAL) {
            // Estimate cost - small contributions typically cost very little (0.001-0.01 WAL)
            const blobSizeMB = buffer.length / (1024 * 1024);
            const estimatedCostWAL = Math.max(0.001, blobSizeMB * 0.01); // Rough estimate: ~0.01 WAL per MB
            
            logger.warn(`Wallet ${this.walletAddress} does not have WAL tokens. ` +
              `SUI balance: ${(balanceInfo.suiBalance / 1e9).toFixed(4)} SUI. ` +
              `Estimated cost for ${blobSizeMB.toFixed(3)} MB: ~${estimatedCostWAL.toFixed(4)} WAL tokens. ` +
              `Please run 'walrus get-wal' with this wallet to exchange SUI for WAL tokens. ` +
              `Cost calculator: https://costcalculator.wal.app/`);
          } else {
            const blobSizeMB = buffer.length / (1024 * 1024);
            logger.info(`Wallet has ${(balanceInfo.walBalance / 1e9).toFixed(4)} WAL tokens available. ` +
              `Storing ${blobSizeMB.toFixed(3)} MB blob (estimated cost: ~${Math.max(0.001, blobSizeMB * 0.01).toFixed(4)} WAL)`);
          }
        } catch (balanceError) {
          logger.warn('Could not check WAL balance before storing:', balanceError.message);
        }
      } else {
        logger.info('No wallet configured. Walrus will use wallet from config file or default wallet.');
      }

      // Use HTTP API if configured, otherwise fall back to CLI
      // Reference: https://docs.wal.app/usage/web-api.html
      // Store: PUT $PUBLISHER/v1/blobs with data in body
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !process.env.HOME;
      
      if (this.useHttpApi && this.publisherUrl) {
        try {
          const epochs = options.epochs || 365;
          const isPermanent = options.permanent || !options.deletable;
          
          // Build query parameters
          const queryParams = new URLSearchParams();
          queryParams.append('epochs', epochs.toString());
          if (isPermanent) {
            queryParams.append('permanent', 'true');
          } else if (options.deletable) {
            queryParams.append('deletable', 'true');
          }
          
          // IMPORTANT: How Walrus HTTP API Payment Works:
          // - The PUBLISHER's wallet pays for storage, NOT the client's wallet
          // - For authenticated publishers: Clients send JWT tokens, publisher's wallet pays
          // - For public testnet: The publisher's operator wallet pays (may be out of funds)
          // - To have YOUR backend pay: Run your own Walrus publisher with YOUR wallet
          //
          // Options for production:
          // 1. Run your own Walrus publisher (your wallet pays, you control it)
          // 2. Use an authenticated publisher (you fund it, issue JWT tokens to clients)
          // 3. Public testnet publisher (uses operator's wallet, may fail if out of funds)
          
          // HTTP API: PUT $PUBLISHER/v1/blobs?epochs=N&permanent=true
          // The body should be the raw binary data
          const url = `${this.publisherUrl.replace(/\/$/, '')}/v1/blobs?${queryParams.toString()}`;
          logger.info(`Storing blob via HTTP API: ${url} (${buffer.length} bytes, permanent: ${isPermanent}, epochs: ${epochs})`);
          
          if (this.publisherUrl.includes('walrus-testnet.walrus.space')) {
            logger.warn('Using public testnet publisher. This uses the publisher operator\'s wallet, not yours.');
            logger.warn('If it fails with "insufficient balance", the public publisher is out of funds.');
            logger.warn('For production, run your own publisher so YOUR wallet pays for storage.');
          }
          
          // Headers
          const headers = {
            'Content-Type': 'application/octet-stream',
          };
          
          // TODO: If using authenticated publisher, add JWT token here:
          // headers['Authorization'] = `Bearer ${jwtToken}`;
          
          let response;
          try {
            response = await fetch(url, {
              method: 'PUT',
              body: buffer,
              headers,
            });
          } catch (fetchError) {
            logger.error('Fetch error:', fetchError.message);
            logger.error('Fetch error stack:', fetchError.stack);
            throw new Error(`Failed to connect to Walrus publisher: ${fetchError.message}. URL: ${url}`);
          }
          
          logger.info(`Walrus HTTP API response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Walrus HTTP API error: ${response.status} ${response.statusText} - ${errorText}`);
            
            // Parse error message for better user feedback
            let parsedError;
            try {
              parsedError = JSON.parse(errorText);
            } catch (e) {
              parsedError = { error: { message: errorText } };
            }
            
            const errorMessage = parsedError?.error?.message || errorText;
            
            // Provide specific guidance for common errors
            if (errorMessage.includes('WAL coins') || errorMessage.includes('sufficient balance')) {
              const walletInfo = this.walletAddress ? `Wallet address: ${this.walletAddress}. ` : 'No wallet configured. ';
              const helpfulMessage = `Insufficient WAL balance: The Walrus account needs WAL tokens to store blobs. ` +
                `${walletInfo}` +
                `To fund the wallet: 1) Get Testnet SUI from the faucet, 2) Exchange SUI for WAL using 'walrus get-wal' command (1:1 rate). ` +
                `See docs: https://docs.wal.app/usage/networks.html and https://docs.wal.app/usage/setup.html. ` +
                `Error: ${errorMessage}. Publisher URL: ${this.publisherUrl}`;
              throw new Error(helpfulMessage);
            }
            
            throw new Error(`Walrus HTTP API error: ${response.status} ${response.statusText} - ${errorMessage}`);
          }
          
          // Parse JSON response
          const contentType = response.headers.get('content-type');
          let result;
          if (contentType && contentType.includes('application/json')) {
            result = await response.json();
          } else {
            const text = await response.text();
            logger.warn('Walrus API returned non-JSON response, attempting to parse:', text.substring(0, 200));
            try {
              result = JSON.parse(text);
            } catch (parseError) {
              throw new Error(`Invalid JSON response from Walrus API: ${text.substring(0, 200)}`);
            }
          }
          logger.info('Walrus HTTP API response received:', JSON.stringify(result).substring(0, 500));
          
          // Extract blob ID from response
          // Response format: { "newlyCreated": { "blobObject": { "blobId": "...", ... } } }
          const blobId = result.newlyCreated?.blobObject?.blobId || 
                        result.blobId || 
                        result.id;
          
          if (!blobId) {
            logger.error('No blob ID in response:', JSON.stringify(result));
            throw new Error('No blob ID in response: ' + JSON.stringify(result));
          }

          const duration = Date.now() - startTime;
          if (this.metricsCollector) {
            this.metricsCollector.recordOperation('walrus', 'store', duration, true);
          }

          logger.info(`Blob stored successfully via HTTP API: ${blobId} (${buffer.length} bytes)`);

          return {
            blobId,
            size: buffer.length,
            deletable: options.deletable || false,
            permanent: isPermanent,
            epochs: epochs,
          };
        } catch (httpError) {
          logger.error('HTTP API failed:', httpError.message);
          logger.error('HTTP API error stack:', httpError.stack);
          
          // Check if it's a balance error or API parameter error - these might work with CLI
          const isBalanceError = httpError.message.includes('WAL coins') || 
                                 httpError.message.includes('sufficient balance') ||
                                 httpError.message.includes('Insufficient WAL balance');
          const isParameterError = httpError.message.includes('unknown field') ||
                                   httpError.message.includes('deserialize') ||
                                   httpError.message.includes('400 Bad Request');
          
          // In serverless environments, only fall back for specific errors that CLI might handle
          if (isServerless && !isBalanceError && !isParameterError) {
            // If it's already a formatted error, just re-throw it
            if (httpError.message.includes('Insufficient WAL balance') || 
                httpError.message.includes('Walrus HTTP API error')) {
              throw httpError;
            }
            throw new Error(`Walrus HTTP API failed in serverless environment: ${httpError.message}. Publisher URL: ${this.publisherUrl}.`);
          }
          
          // For non-serverless environments, try CLI fallback (CLI won't work in production/serverless)
          if (!isServerless) {
            if (isBalanceError) {
              logger.warn('HTTP API failed due to balance issue. CLI uses wallet from config file, which may work. Falling back to CLI:', httpError.message);
            } else if (isParameterError) {
              logger.warn('HTTP API failed due to parameter issue (public publisher may not support all parameters). Falling back to CLI which uses config file:', httpError.message);
            } else {
              logger.warn('HTTP API failed, falling back to CLI:', httpError.message);
            }
            // Fall through to CLI method for local development
          } else {
            // In serverless/production, CLI won't work - provide helpful error
            const errorMsg = isBalanceError 
              ? `HTTP API failed: The public testnet publisher may not have sufficient WAL tokens, or it doesn't accept client wallet addresses. ` +
                `For production, consider running your own Walrus publisher or using a different storage solution. ` +
                `Error: ${httpError.message}`
              : `HTTP API failed and CLI fallback is not available in serverless environments. ` +
                `Error: ${httpError.message}`;
            throw new Error(errorMsg);
          }
          // Fall through to CLI method (only for non-serverless)
        }
      } else {
        // HTTP API not configured
        if (isServerless) {
          // In serverless, HTTP API is required
          throw new Error(`Walrus HTTP API is required in serverless environments. Publisher URL: ${this.publisherUrl}, Aggregator URL: ${this.aggregatorUrl}.`);
        }
        // In non-serverless, we can use CLI
        logger.info('HTTP API not configured, using CLI fallback');
      }

      // CLI fallback (only in non-serverless environments)
      let tempFile = null;
      try {
        // Write data to temporary file
        tempFile = join(tmpdir(), `walrus-store-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp`);
        await writeFile(tempFile, buffer);

        // Build command: walrus store <file> --epochs <n> [--permanent|--deletable]
        const epochs = options.epochs || 365;
        let command = `store ${tempFile} --epochs ${epochs}`;
        
        if (options.permanent || !options.deletable) {
          command += ' --permanent';
        } else if (options.deletable) {
          command += ' --deletable';
        }

        // Execute command with JSON output
        const result = await this.executeWalrusCommand(command, { json: true });
        const blobId = this.extractBlobId(result);

        const duration = Date.now() - startTime;
        if (this.metricsCollector) {
          this.metricsCollector.recordOperation('walrus', 'store', duration, true);
        }

        logger.info(`Blob stored successfully via CLI: ${blobId} (${buffer.length} bytes)`);

        return {
          blobId,
          size: buffer.length,
          deletable: options.deletable || false,
          permanent: options.permanent || false,
          epochs: options.epochs || 365,
        };
      } finally {
        // Clean up temp file
        if (tempFile) {
          try {
            await unlink(tempFile);
          } catch (e) {
            logger.warn('Failed to delete temp file:', e.message);
          }
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('walrus', 'store', duration, false);
      }
      logger.error('Error storing blob:', error);
      throw new Error(`Failed to store blob: ${error.message}`);
    }
  }

  /**
   * Read a blob from Walrus
   * 
   * Operation: Read
   * Reference: https://docs.wal.app/dev-guide/dev-operations.html#read
   * HTTP API: GET $AGGREGATOR/v1/blobs/<blob_id>
   * CLI: walrus read <blob-id> [--output <file>]
   * 
   * @param {string} blobId - Blob ID to read
   * @returns {Promise<Buffer>} Blob data
   */
  async readBlob(blobId) {
    const startTime = Date.now();

    try {
      logger.info(`Reading blob: ${blobId}`);

      // Use HTTP API if configured, otherwise fall back to CLI
      // Reference: https://docs.wal.app/usage/web-api.html
      // Read: GET $AGGREGATOR/v1/blobs/<blob_id> or $PUBLISHER/v1/blobs/<blob_id>
      if (this.useHttpApi && this.aggregatorUrl) {
        try {
          // Try aggregator first, fallback to publisher
          const urls = [
            `${this.aggregatorUrl.replace(/\/$/, '')}/v1/blobs/${blobId}`,
            `${this.publisherUrl?.replace(/\/$/, '')}/v1/blobs/${blobId}`,
          ].filter(Boolean);
          
          let lastError = null;
          for (const url of urls) {
            try {
              logger.debug(`Reading blob via HTTP API: ${url}`);
              
              const response = await fetch(url, {
                method: 'GET',
              });
              
              if (!response.ok) {
                if (response.status === 404 && urls.length > 1) {
                  // Try next URL if this one returns 404
                  continue;
                }
                const errorText = await response.text();
                throw new Error(`Walrus HTTP API error: ${response.status} ${response.statusText} - ${errorText}`);
              }
              
              // Response is binary data
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              const duration = Date.now() - startTime;
              if (this.metricsCollector) {
                this.metricsCollector.recordOperation('walrus', 'read', duration, true);
              }
              
              logger.info(`Blob read successfully via HTTP API: ${blobId} (${buffer.length} bytes)`);
              return buffer;
            } catch (error) {
              lastError = error;
              // Continue to next URL or CLI fallback
            }
          }
          
          // If all URLs failed, throw the last error
          if (lastError) {
            throw lastError;
          }
        } catch (httpError) {
          logger.warn('HTTP API failed, falling back to CLI:', httpError.message);
          // Fall through to CLI method
        }
      }

      // CLI fallback
      let outputFile = null;
      try {
        // Create temp file for output
        outputFile = join(tmpdir(), `walrus-read-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp`);

        // Execute command: walrus read <blob-id> --out <file>
        const command = `read ${blobId} --out ${outputFile}`;
        await this.executeWalrusCommand(command);

        // Read the file content
        const data = await readFile(outputFile);
        
        const duration = Date.now() - startTime;
        if (this.metricsCollector) {
          this.metricsCollector.recordOperation('walrus', 'read', duration, true);
        }
        
        logger.info(`Blob read successfully via CLI: ${blobId} (${data.length} bytes)`);
        return data;
      } finally {
        // Clean up temp file
        if (outputFile) {
          try {
            await unlink(outputFile);
          } catch (e) {
            logger.warn('Failed to delete temp file:', e.message);
          }
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('walrus', 'read', duration, false);
      }
      logger.error(`Error reading blob ${blobId}:`, error);
      throw new Error(`Failed to read blob: ${error.message}`);
    }
  }

  /**
   * Get blob status from Sui
   * 
   * Operation: Certify Availability
   * Reference: https://docs.wal.app/dev-guide/dev-operations.html#certify-availability
   * CLI: walrus blob-status <blob-id>
   * 
   * @param {string} blobId - Blob ID to check
   * @returns {Promise<Object>} Blob status information
   */
  async getBlobStatus(blobId) {
    const startTime = Date.now();
    try {
      logger.info(`Getting blob status: ${blobId}`);

      // Execute command: walrus blob-status --blob-id <blob-id>
      // Note: Official docs use --blob-id flag
      const command = `blob-status --blob-id ${blobId}`;
      const result = await this.executeWalrusCommand(command, { json: true });

      // Parse blob status
      const status = this.parseBlobStatus(result, blobId);

      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('walrus', 'status', duration, true);
      }

      return status;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('walrus', 'status', duration, false);
      }
      logger.error(`Error getting blob status ${blobId}:`, error);
      throw new Error(`Failed to get blob status: ${error.message}`);
    }
  }

  /**
   * Get Walrus system information
   * 
   * CLI: walrus info
   * 
   * @returns {Promise<Object>} System information
   */
  async getInfo() {
    try {
      logger.debug('Getting Walrus system info...');

      const command = 'info';
      const result = await this.executeWalrusCommand(command, { json: true });

      return this.parseInfo(result);
    } catch (error) {
      logger.error('Error getting Walrus info:', error);
      throw new Error(`Failed to get Walrus info: ${error.message}`);
    }
  }

  /**
   * Store a contribution (ODX-specific)
   * 
   * Stores a contribution object as JSON on Walrus
   * 
   * @param {Object} contribution - Contribution object
   * @returns {Promise<Object>} Stored contribution with blob ID
   */
  async storeContribution(contribution) {
    try {
      // Convert contribution to JSON
      const jsonData = JSON.stringify(contribution, null, 2);
      
      // Store on Walrus (contributions should be permanent/non-deletable)
      // Since v1.33, blobs are deletable by default, so we use --permanent flag
      const result = await this.storeBlob(jsonData, {
        permanent: true, // Contributions should be permanent (non-deletable)
        epochs: 365, // Store for 1 year (adjust as needed)
      });

      // Add blob ID to contribution
      contribution.walrus_cid = result.blobId;
      contribution.walrus_blob_id = result.blobId;

      logger.info(`Contribution stored: ${result.blobId}`);
      return {
        ...contribution,
        ...result,
      };
    } catch (error) {
      logger.error('Error storing contribution:', error);
      throw new Error(`Failed to store contribution: ${error.message}`);
    }
  }

  /**
   * Read a contribution by blob ID
   * 
   * @param {string} blobId - Blob ID
   * @returns {Promise<Object>} Contribution object
   */
  async readContribution(blobId) {
    try {
      const data = await this.readBlob(blobId);
      const json = data.toString('utf-8');
      return JSON.parse(json);
    } catch (error) {
      logger.error(`Error reading contribution ${blobId}:`, error);
      throw new Error(`Failed to read contribution: ${error.message}`);
    }
  }

  /**
   * Extract blob ID from Walrus command output
   * 
   * Handles both JSON and text output formats
   */
  extractBlobId(result) {
    // Try JSON format first (from JSON mode or structured output)
    if (result.blob_id) return result.blob_id;
    if (result.blobId) return result.blobId;
    if (result.id) return result.id;
    
    // Check for newlyCreated response format (from store command)
    if (result.newlyCreated?.blobObject?.blobId) {
      return result.newlyCreated.blobObject.blobId;
    }
    if (result.newlyCreated?.blobObject?.id) {
      return result.newlyCreated.blobObject.id;
    }

    // Try text output format
    if (result.output) {
      // Look for "Blob ID: ..." pattern (can be base64 or hex)
      const match = result.output.match(/Blob ID[:\s]+([^\s\n]+)/i);
      if (match) return match[1].trim();
      
      // Look for base64 blob ID pattern (Walrus uses base64-encoded IDs)
      const base64Match = result.output.match(/([A-Za-z0-9_-]{43,})/);
      if (base64Match) return base64Match[1];
      
      // Look for hex pattern (0x...)
      const hexMatch = result.output.match(/(0x[a-fA-F0-9]{64,})/);
      if (hexMatch) return hexMatch[1];
    }
    
    logger.error('Could not extract blob ID from result:', JSON.stringify(result, null, 2));
    throw new Error('Could not extract blob ID from Walrus command result');
  }

  /**
   * Parse blob status from command output
   * 
   * Handles both JSON and text output formats
   * Based on: https://docs.wal.app/usage/client-cli#blob-status
   */
  parseBlobStatus(result, blobId) {
    const status = {
      blobId,
      certified: false,
      deletable: false,
      permanent: false,
      expiryEpoch: null,
      endEpoch: null,
      eventId: null,
      objectId: null,
    };

    // Try JSON format first
    if (result.certified !== undefined || result.certifiedEpoch !== undefined) {
      return {
        ...status,
        ...result,
        certified: result.certified || result.certifiedEpoch !== null,
        deletable: result.deletable || false,
        permanent: !result.deletable || false,
        expiryEpoch: result.expiryEpoch || result.endEpoch,
        endEpoch: result.endEpoch || result.expiryEpoch,
      };
    }

    // Parse from text output
    if (result.output) {
      const output = result.output.toLowerCase();
      
      if (output.includes('certified')) status.certified = true;
      if (output.includes('deletable')) status.deletable = true;
      if (output.includes('permanent')) status.permanent = true;
      
      // Extract epoch (can be expiryEpoch or endEpoch)
      const epochMatch = result.output.match(/(?:expiry|end)[\s_]*epoch[:\s]+(\d+)/i);
      if (epochMatch) {
        status.expiryEpoch = parseInt(epochMatch[1]);
        status.endEpoch = parseInt(epochMatch[1]);
      }
      
      // Extract event ID (for certified blobs)
      const eventMatch = result.output.match(/event[:\s]+(0x[a-fA-F0-9]+|[A-Za-z0-9_-]+)/i);
      if (eventMatch) status.eventId = eventMatch[1];
      
      // Extract object ID
      const objectMatch = result.output.match(/object[:\s]+(0x[a-fA-F0-9]{64,})/i);
      if (objectMatch) status.objectId = objectMatch[1];
    }

    return status;
  }

  /**
   * Parse info output from Walrus
   */
  parseInfo(result) {
    // Try JSON format first
    if (result.system_object || result.epoch_duration) {
      return result;
    }

    // Parse from text output
    const info = {
      systemObject: null,
      epochDuration: null,
      network: null,
    };

    if (result.output) {
      const sysObjMatch = result.output.match(/system object[:\s]+(0x[a-fA-F0-9]+)/i);
      if (sysObjMatch) info.systemObject = sysObjMatch[1];

      const epochMatch = result.output.match(/epoch duration[:\s]+([^\n]+)/i);
      if (epochMatch) info.epochDuration = epochMatch[1].trim();

      const networkMatch = result.output.match(/network[:\s]+([^\n]+)/i);
      if (networkMatch) info.network = networkMatch[1].trim();
    }

    return info;
  }

  /**
   * Query contributions by IP token ID
   * 
   * This is a custom implementation for ODX that queries Walrus
   * for contributions associated with an IP token.
   * 
   * Walrus does not support querying by metadata.
   * This method is kept for backward compatibility but should
   * be used via WalrusIndexerService instead.
   * 
   * @param {string} ipTokenId - IP token ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of contributions
   */
  async queryContributionsByIP(ipTokenId, options = {}) {
    // This method is kept for backward compatibility
    // The actual implementation is in WalrusIndexerService
    // which maintains an index of contributions by IP token ID
    logger.warn('queryContributionsByIP should be called via WalrusIndexerService');
    return [];
  }

  /**
   * Query contributions by type
   * @param {string} ipTokenId - The IP token ID
   * @param {string} type - Contribution type (rating, meme, prediction, etc.)
   * @returns {Promise<Array>} Array of contributions
   */
  async queryByType(ipTokenId, type) {
    return this.queryContributionsByIP(ipTokenId, { type });
  }

  /**
   * Query contributions by time range
   * @param {string} ipTokenId - The IP token ID
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {Promise<Array>} Array of contributions
   */
  async queryByTimeRange(ipTokenId, startTime, endTime) {
    return this.queryContributionsByIP(ipTokenId, { startTime, endTime });
  }

  /**
   * Get a specific contribution by CID
   * @param {string} cid - Content ID (blob ID)
   * @returns {Promise<Object>} Contribution object
   */
  async getContribution(cid) {
    return this.readContribution(cid);
  }
}
