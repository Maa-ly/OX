import { config, validateConfig } from './config/config.js';
import { logger } from './utils/logger.js';

// Main entry point
async function main() {
  logger.info('Starting ODX Oracle Service...');
  logger.info(`Sui Network: ${config.sui.network}`);
  logger.info(`Walrus Context: ${config.walrus.context}`);

  // Validate configuration
  const isValid = validateConfig();
  if (!isValid) {
    logger.warn('Configuration incomplete. Some features may not work.');
    logger.warn('Please set ORACLE_OBJECT_ID, ADMIN_CAP_ID, and PACKAGE_ID in .env');
  }

  // TODO: Initialize services
  // - Walrus query service
  // - Signature verification service
  // - Metrics aggregation service
  // - Sui contract interface
  // - Scheduler

  logger.info('Oracle service initialized. Waiting for implementation...');
  logger.info('See WALRUS_INTEGRATOR_GUIDE.md for implementation details.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  process.exit(0);
});

// Start the service
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

