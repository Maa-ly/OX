import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Walrus Publisher Manager
 * 
 * Manages the Walrus publisher daemon as part of the backend process.
 * Starts the publisher on backend startup and stops it on shutdown.
 */
export class WalrusPublisherManager {
  constructor() {
    this.publisherProcess = null;
    this.isRunning = false;
    this.shouldStart = process.env.START_WALRUS_PUBLISHER !== 'false'; // Default to true
  }

  /**
   * Start the Walrus publisher daemon
   */
  async start() {
    if (!this.shouldStart) {
      logger.info('Walrus publisher auto-start disabled (START_WALRUS_PUBLISHER=false)');
      return;
    }

    // Check if using own publisher (not public testnet)
    const publisherUrl = process.env.WALRUS_PUBLISHER_URL || config.walrus.publisherUrl;
    if (!publisherUrl.includes('127.0.0.1') && !publisherUrl.includes('localhost')) {
      logger.info('Using external publisher, not starting local publisher daemon');
      return;
    }

    // Extract port from publisher URL
    let port = '31416';
    let host = '127.0.0.1';
    
    try {
      // Ensure URL has protocol for parsing
      const urlString = publisherUrl.startsWith('http') ? publisherUrl : `http://${publisherUrl}`;
      const url = new URL(urlString);
      port = url.port || '31416';
      host = url.hostname || '127.0.0.1';
    } catch (error) {
      // If URL parsing fails, try to extract manually
      const match = publisherUrl.match(/(?:http:\/\/)?([^:]+):?(\d+)?/);
      if (match) {
        host = match[1] || '127.0.0.1';
        port = match[2] || '31416';
      }
      logger.warn(`Could not parse publisher URL: ${publisherUrl}, using defaults: ${host}:${port}`);
    }
    
    const bindAddress = `${host}:${port}`;

    // Check if walrus command exists
    const walrusPath = process.env.WALRUS_BINARY_PATH || 'walrus';
    
    // Check if walrus is available
    try {
      const { execSync } = await import('child_process');
      execSync(`${walrusPath} --version`, { stdio: 'ignore' });
    } catch (error) {
      logger.warn('Walrus CLI not found. Publisher daemon will not start.');
      logger.warn('Install walrus CLI or set WALRUS_BINARY_PATH environment variable.');
      return;
    }

    // Configuration
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const configPath = config.walrus.configPath.replace('~', homeDir);
    const context = config.walrus.context;
    const walletsDir = process.env.WALRUS_PUBLISHER_WALLETS_DIR || 
                      join(homeDir, '.config', 'walrus', 'publisher-wallets');
    const nClients = parseInt(process.env.WALRUS_PUBLISHER_N_CLIENTS || '1', 10);

    // Create wallets directory if it doesn't exist
    const { mkdirSync } = await import('fs');
    try {
      mkdirSync(walletsDir, { recursive: true });
    } catch (error) {
      logger.warn(`Could not create publisher wallets directory: ${error.message}`);
    }

    logger.info('Starting Walrus publisher daemon...');
    logger.info(`  Bind Address: ${bindAddress}`);
    logger.info(`  Wallets Dir: ${walletsDir}`);
    logger.info(`  Context: ${context}`);

    // Build command arguments
    const args = [
      'publisher',
      '--bind-address', bindAddress,
      '--sub-wallets-dir', walletsDir,
      '--n-clients', nClients.toString(),
      '--config', configPath,
      '--context', context,
    ];

    // Start the publisher process
    try {
      this.publisherProcess = spawn(walrusPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'], // stdin: ignore, stdout/stderr: pipe for logging
        detached: false,
      });

      // Log publisher output
      this.publisherProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          logger.debug(`[Walrus Publisher] ${output}`);
        }
      });

      this.publisherProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output && !output.includes('INFO')) { // Skip INFO level logs
          logger.warn(`[Walrus Publisher] ${output}`);
        }
      });

      // Handle process exit
      this.publisherProcess.on('exit', (code, signal) => {
        this.isRunning = false;
        if (code !== null && code !== 0) {
          logger.error(`Walrus publisher exited with code ${code}`);
        } else if (signal) {
          logger.info(`Walrus publisher stopped by signal ${signal}`);
        } else {
          logger.info('Walrus publisher stopped');
        }
        this.publisherProcess = null;
      });

      // Handle process errors
      this.publisherProcess.on('error', (error) => {
        logger.error(`Failed to start Walrus publisher: ${error.message}`);
        this.isRunning = false;
        this.publisherProcess = null;
      });

      // Wait a bit to see if it starts successfully
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (this.publisherProcess.killed || !this.publisherProcess.pid) {
        logger.error('Walrus publisher failed to start');
        return;
      }

      this.isRunning = true;
      logger.info(`✓ Walrus publisher daemon started (PID: ${this.publisherProcess.pid})`);
      logger.info(`  Publisher available at: ${publisherUrl}`);

    } catch (error) {
      logger.error('Error starting Walrus publisher:', error);
      this.publisherProcess = null;
    }
  }

  /**
   * Stop the Walrus publisher daemon
   */
  async stop() {
    if (!this.publisherProcess || !this.isRunning) {
      return;
    }

    logger.info('Stopping Walrus publisher daemon...');

    try {
      // Send SIGTERM for graceful shutdown
      if (this.publisherProcess.pid) {
        process.kill(this.publisherProcess.pid, 'SIGTERM');
        
        // Wait up to 5 seconds for graceful shutdown
        let waited = 0;
        while (this.isRunning && waited < 5000) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          waited += 100;
        }

        // Force kill if still running
        if (this.isRunning && this.publisherProcess.pid) {
          logger.warn('Publisher did not stop gracefully, forcing shutdown...');
          process.kill(this.publisherProcess.pid, 'SIGKILL');
        }
      }

      this.isRunning = false;
      this.publisherProcess = null;
      logger.info('✓ Walrus publisher daemon stopped');
    } catch (error) {
      logger.error('Error stopping Walrus publisher:', error);
      this.publisherProcess = null;
      this.isRunning = false;
    }
  }

  /**
   * Check if publisher is running
   */
  isPublisherRunning() {
    return this.isRunning && this.publisherProcess && !this.publisherProcess.killed;
  }

  /**
   * Get publisher process info
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pid: this.publisherProcess?.pid || null,
      shouldStart: this.shouldStart,
    };
  }
}

