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
 * Implements Walrus operations using the CLI as per:
 * https://docs.wal.app/usage/interacting.html
 * 
 * Supports:
 * - CLI commands (primary method)
 * - JSON API (via CLI with --json flag)
 * - Can be extended to use HTTP API
 */
export class WalrusService {
  constructor() {
    // Walrus binary path (installed via suiup)
    this.walrusPath = process.env.WALRUS_BINARY_PATH || 
      '~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus';
    
    // Expand ~ in path
    this.walrusPath = this.walrusPath.replace('~', process.env.HOME || '');
    
    // Walrus config path
    this.configPath = config.walrus.configPath.replace('~', process.env.HOME || '');
    this.context = config.walrus.context;
    
    // Sui client for reading blob metadata
    this.suiClient = new SuiClient({ url: config.sui.rpcUrl });
    
    // Metrics collector (set externally)
    this.metricsCollector = null;
  }

  /**
   * Set metrics collector (called by service that instantiates this)
   */
  setMetricsCollector(collector) {
    this.metricsCollector = collector;
  }

  /**
   * Execute Walrus CLI command
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
      throw new Error(`Walrus command failed: ${error.message}`);
    }
  }

  /**
   * Store a blob on Walrus
   * 
   * Operation: Store
   * Reference: https://docs.wal.app/dev-guide/dev-operations.html#store
   * CLI: walrus store <file> [--deletable] [--epochs <n>]
   * 
   * @param {Buffer|string} data - Data to store
   * @param {Object} options - Storage options
   * @returns {Promise<Object>} Blob information with blob ID
   */
  async storeBlob(data, options = {}) {
    const startTime = Date.now();
    let tempFile = null;

    try {
      logger.info('Storing blob on Walrus...');

      // Convert data to buffer if string
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');

      // Write data to temporary file
      tempFile = join(tmpdir(), `walrus-store-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp`);
      await writeFile(tempFile, buffer);

      // Build command: walrus store <file> [--deletable] [--epochs <n>]
      let command = `store ${tempFile}`;
      
      if (options.deletable) {
        command += ' --deletable';
      }
      
      if (options.epochs) {
        command += ` --epochs ${options.epochs}`;
      }

      // Execute command with JSON output
      const result = await this.executeWalrusCommand(command, { json: true });

      // Extract blob ID from result
      const blobId = this.extractBlobId(result);

      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('walrus', 'store', duration, true);
      }

      logger.info(`Blob stored successfully: ${blobId} (${buffer.length} bytes)`);

      return {
        blobId,
        size: buffer.length,
        deletable: options.deletable || false,
        epochs: options.epochs || null,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('walrus', 'store', duration, false);
      }
      logger.error('Error storing blob:', error);
      throw new Error(`Failed to store blob: ${error.message}`);
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
  }

  /**
   * Read a blob from Walrus
   * 
   * Operation: Read
   * Reference: https://docs.wal.app/dev-guide/dev-operations.html#read
   * CLI: walrus read <blob-id> [--output <file>]
   * 
   * @param {string} blobId - Blob ID to read
   * @returns {Promise<Buffer>} Blob data
   */
  async readBlob(blobId) {
    const startTime = Date.now();
    let outputFile = null;

    try {
      logger.info(`Reading blob: ${blobId}`);

      // Create temp file for output
      outputFile = join(tmpdir(), `walrus-read-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp`);

      // Execute command: walrus read <blob-id> --output <file>
      const command = `read ${blobId} --output ${outputFile}`;
      await this.executeWalrusCommand(command);

      // Read the file content
      const data = await readFile(outputFile);
      
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('walrus', 'read', duration, true);
      }
      
      logger.info(`Blob read successfully: ${blobId} (${data.length} bytes)`);
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('walrus', 'read', duration, false);
      }
      logger.error(`Error reading blob ${blobId}:`, error);
      throw new Error(`Failed to read blob: ${error.message}`);
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

      // Execute command: walrus blob-status <blob-id>
      const command = `blob-status ${blobId}`;
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
      
      // Store on Walrus (contributions should not be deletable)
      const result = await this.storeBlob(jsonData, {
        deletable: false, // Contributions should not be deletable
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
    // Try JSON format first
    if (result.blob_id) return result.blob_id;
    if (result.blobId) return result.blobId;
    if (result.id) return result.id;

    // Try text output format
    if (result.output) {
      // Look for "Blob ID: 0x..." pattern
      const match = result.output.match(/Blob ID:\s*(0x[a-fA-F0-9]+)/i);
      if (match) return match[1];
      
      // Look for just "0x..." pattern
      const hexMatch = result.output.match(/(0x[a-fA-F0-9]{64,})/);
      if (hexMatch) return hexMatch[1];
    }
    
    throw new Error('Could not extract blob ID from result');
  }

  /**
   * Parse blob status from command output
   * 
   * Handles both JSON and text output formats
   */
  parseBlobStatus(result, blobId) {
    const status = {
      blobId,
      certified: false,
      deletable: false,
      expiryEpoch: null,
      eventId: null,
    };

    // Try JSON format first
    if (result.certified !== undefined) {
      return { ...status, ...result };
    }

    // Parse from text output
    if (result.output) {
      const output = result.output.toLowerCase();
      
      if (output.includes('certified')) status.certified = true;
      if (output.includes('deletable')) status.deletable = true;
      
      // Extract epoch
      const epochMatch = result.output.match(/expiry[:\s]+(\d+)/i);
      if (epochMatch) status.expiryEpoch = parseInt(epochMatch[1]);
      
      // Extract event ID
      const eventMatch = result.output.match(/event[:\s]+(0x[a-fA-F0-9]+)/i);
      if (eventMatch) status.eventId = eventMatch[1];
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
