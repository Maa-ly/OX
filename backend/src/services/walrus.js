import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { SuiClient } from '@mysten/sui/client';

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
 * Supports:
 * - HTTP API (primary method, works in serverless environments)
 * - CLI commands (fallback for local development)
 */
export class WalrusService {
  constructor() {
    // HTTP API configuration (primary method)
    // Reference: https://docs.wal.app/usage/web-api.html
    this.useHttpApi = config.walrus.useHttpApi;
    this.aggregatorUrl = config.walrus.aggregatorUrl; // For reading blobs
    this.publisherUrl = config.walrus.publisherUrl; // For storing blobs
    
    // CLI configuration (fallback)
    this.walrusPath = process.env.WALRUS_BINARY_PATH || 
      '~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus';
    this.walrusPath = this.walrusPath.replace('~', process.env.HOME || '');
    this.configPath = config.walrus.configPath.replace('~', process.env.HOME || '');
    this.context = config.walrus.context;
    
    // Sui client for reading blob metadata
    this.suiClient = new SuiClient({ url: config.sui.rpcUrl });
    
    // Metrics collector (set externally)
    this.metricsCollector = null;
    
    // Log which method we're using
    if (this.useHttpApi && this.publisherUrl && this.aggregatorUrl) {
      logger.info(`WalrusService: Using HTTP API - Publisher: ${this.publisherUrl}, Aggregator: ${this.aggregatorUrl}`);
    } else {
      logger.info('WalrusService: Using CLI (HTTP API not fully configured)');
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
      throw new Error('Walrus aggregator URL not configured. Set WALRUS_AGGREGATOR_URL environment variable. You can find aggregator URLs in the Walrus documentation or by running "walrus info"');
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
   * HTTP API: POST $AGGREGATOR/v1/blobs
   * CLI: walrus store <file> [--deletable] [--epochs <n>]
   * 
   * @param {Buffer|string} data - Data to store
   * @param {Object} options - Storage options
   * @returns {Promise<Object>} Blob information with blob ID
   */
  async storeBlob(data, options = {}) {
    const startTime = Date.now();

    try {
      logger.info('Storing blob on Walrus...');

      // Convert data to buffer if string
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');

      // Use HTTP API if configured, otherwise fall back to CLI
      // Reference: https://docs.wal.app/usage/web-api.html
      // Store: PUT $PUBLISHER/v1/blobs with data in body
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
          
          // HTTP API: PUT $PUBLISHER/v1/blobs?epochs=N&permanent=true
          // The body should be the raw binary data
          const url = `${this.publisherUrl.replace(/\/$/, '')}/v1/blobs?${queryParams.toString()}`;
          logger.debug(`Storing blob via HTTP API: ${url}`);
          
          const response = await fetch(url, {
            method: 'PUT',
            body: buffer,
            headers: {
              'Content-Type': 'application/octet-stream',
            },
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Walrus HTTP API error: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          // Parse JSON response
          const result = await response.json();
          
          // Extract blob ID from response
          // Response format: { "newlyCreated": { "blobObject": { "blobId": "...", ... } } }
          const blobId = result.newlyCreated?.blobObject?.blobId || 
                        result.blobId || 
                        result.id;
          
          if (!blobId) {
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
          logger.warn('HTTP API failed, falling back to CLI:', httpError.message);
          // Fall through to CLI method
        }
      }

      // CLI fallback
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
