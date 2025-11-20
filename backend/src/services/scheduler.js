import cron from 'node-cron';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { WalrusService } from './walrus.js';
import { WalrusIndexerService } from './walrus-indexer.js';
import { VerificationService } from './verification.js';
import { AggregationService } from './aggregation.js';
import { SuiService } from './sui.js';
import { contractService } from './contract.js';

export class OracleScheduler {
  constructor() {
    this.walrusService = new WalrusService();
    this.indexerService = new WalrusIndexerService();
    this.verificationService = new VerificationService();
    this.aggregationService = new AggregationService();
    this.suiService = new SuiService();
    this.job = null;
    this.isRunning = false;
  }

  /**
   * Initialize the scheduler
   */
  async initialize() {
    logger.info('Initializing Oracle Scheduler...');

    // Schedule periodic updates
    // Run every hour by default, or use cron expression from config
    const interval = config.update.interval;
    const hours = Math.floor(interval / (60 * 60 * 1000));
    
    // Ensure minimum of 1 hour to avoid invalid cron expressions
    const safeHours = Math.max(1, hours);
    const cronExpression = `0 */${safeHours} * * * *`;

    logger.info(`Scheduling updates with cron: ${cronExpression} (interval: ${interval}ms, ${safeHours} hours)`);

    this.job = cron.schedule(cronExpression, async () => {
      if (this.isRunning) {
        logger.warn('Previous update still running, skipping...');
        return;
      }

      await this.updateAllIPTokens();
    });

    logger.info('Oracle Scheduler initialized');
  }

  /**
   * Update metrics for all IP tokens
   */
  async updateAllIPTokens() {
    this.isRunning = true;
    logger.info('Starting scheduled update for all IP tokens...');

    try {
      // Get all IP tokens from smart contract
      logger.info('Fetching all IP tokens from TokenRegistry...');
      const ipTokens = await contractService.getAllTokens();

      if (!ipTokens || ipTokens.length === 0) {
        logger.warn('No IP tokens found to update');
        return;
      }

      logger.info(`Found ${ipTokens.length} IP token(s) to update`);

      const results = [];

      for (const ipTokenId of ipTokens) {
        try {
          logger.info(`Updating metrics for IP token: ${ipTokenId}`);

          // 1. Query contributions from Walrus (via indexer)
          const contributions = await this.indexerService.queryContributionsByIP(ipTokenId);

          // 2. Verify signatures
          const verified = await this.verificationService.verifyContributions(contributions);

          // 3. Aggregate metrics
          const metrics = this.aggregationService.aggregateMetrics(verified);

          // 4. Update on-chain
          const result = await this.suiService.updateEngagementMetrics(ipTokenId, metrics);

          results.push({
            ipTokenId,
            success: true,
            transaction: result.digest,
          });

          logger.info(`Successfully updated ${ipTokenId}`);
        } catch (error) {
          logger.error(`Failed to update ${ipTokenId}:`, error);
          results.push({
            ipTokenId,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      logger.info(`Scheduled update completed: ${successCount} succeeded, ${failCount} failed`);
    } catch (error) {
      logger.error('Error in scheduled update:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the scheduler
   */
  async stop() {
    if (this.job) {
      this.job.stop();
      logger.info('Oracle Scheduler stopped');
    }
  }
}

