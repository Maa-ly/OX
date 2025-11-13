import express from 'express';
import { logger } from '../utils/logger.js';
import { WalrusService } from '../services/walrus.js';
import { WalrusIndexerService } from '../services/walrus-indexer.js';
import { VerificationService } from '../services/verification.js';
import { AggregationService } from '../services/aggregation.js';
import { SuiService } from '../services/sui.js';

const router = express.Router();
const walrusService = new WalrusService();
const indexerService = new WalrusIndexerService();
const verificationService = new VerificationService();
const aggregationService = new AggregationService();
const suiService = new SuiService();

// Metrics collector will be set by server.js
let metricsCollector = null;
export function setMetricsCollector(collector) {
  metricsCollector = collector;
  walrusService.setMetricsCollector(collector);
}

// Get contributions for an IP token
router.get('/contributions/:ipTokenId', async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { ipTokenId } = req.params;
    const { type, startTime: startTimeParam, endTime } = req.query;

    logger.info(`Fetching contributions for IP token: ${ipTokenId}`);

    const contributions = await indexerService.queryContributionsByIP(ipTokenId, {
      type,
      startTime: startTimeParam ? parseInt(startTimeParam) : undefined,
      endTime: endTime ? parseInt(endTime) : undefined,
    });

    const duration = Date.now() - startTime;
    if (metricsCollector) {
      metricsCollector.recordOperation('oracle', 'query', duration, true);
      metricsCollector.counters.oracle.contributionsQueried += contributions.length;
    }

    res.json({
      success: true,
      ipTokenId,
      count: contributions.length,
      contributions,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    if (metricsCollector) {
      metricsCollector.recordOperation('oracle', 'query', duration, false);
    }
    next(error);
  }
});

// Store a new contribution
router.post('/contributions', async (req, res, next) => {
  try {
    const contribution = req.body;

    if (!contribution.ip_token_id) {
      return res.status(400).json({
        success: false,
        error: 'ip_token_id is required',
      });
    }

    logger.info(`Storing contribution for IP token: ${contribution.ip_token_id}`);

    // Store on Walrus
    const stored = await walrusService.storeContribution(contribution);

    // Index the contribution
    await indexerService.indexContribution(
      contribution.ip_token_id,
      stored.blobId,
      {
        engagement_type: contribution.engagement_type,
        timestamp: contribution.timestamp || Date.now(),
        user_wallet: contribution.user_wallet,
      }
    );

    if (metricsCollector) {
      metricsCollector.counters.oracle.contributionsStored += 1;
    }

    res.json({
      success: true,
      contribution: stored,
    });
  } catch (error) {
    if (metricsCollector) {
      metricsCollector.recordOperation('oracle', 'store', 0, false);
    }
    next(error);
  }
});

// Verify a contribution
router.post('/verify', async (req, res, next) => {
  try {
    const { contribution } = req.body;

    if (!contribution) {
      return res.status(400).json({
        success: false,
        error: 'Contribution data is required',
      });
    }

    const isValid = await verificationService.verifyContribution(contribution);

    res.json({
      success: true,
      valid: isValid,
    });
  } catch (error) {
    next(error);
  }
});

// Aggregate metrics for an IP token
router.get('/metrics/:ipTokenId', async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { ipTokenId } = req.params;

    logger.info(`Aggregating metrics for IP token: ${ipTokenId}`);

    // 1. Query contributions from Walrus (via indexer)
    const contributions = await indexerService.queryContributionsByIP(ipTokenId);

    // 2. Verify signatures
    const verified = await verificationService.verifyContributions(contributions);
    
    if (metricsCollector) {
      metricsCollector.counters.verification.verified += verified.length;
      metricsCollector.counters.verification.failed += (contributions.length - verified.length);
    }

    // 3. Aggregate metrics
    const metrics = aggregationService.aggregateMetrics(verified);
    
    const duration = Date.now() - startTime;
    if (metricsCollector) {
      metricsCollector.recordOperation('oracle', 'aggregate', duration, true);
      metricsCollector.counters.oracle.metricsCalculated += 1;
      metricsCollector.counters.aggregation.performed += 1;
    }

    res.json({
      success: true,
      ipTokenId,
      metrics,
      stats: {
        totalContributions: contributions.length,
        verifiedContributions: verified.length,
        invalidContributions: contributions.length - verified.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update metrics on-chain
router.post('/update/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    const { force } = req.query;

    logger.info(`Updating on-chain metrics for IP token: ${ipTokenId}`);

    // 1. Query contributions from Walrus (via indexer)
    const contributions = await indexerService.queryContributionsByIP(ipTokenId);

    // 2. Verify signatures
    const verified = await verificationService.verifyContributions(contributions);

    // 3. Aggregate metrics
    const metrics = aggregationService.aggregateMetrics(verified);

    // 4. Update on-chain
    const updateStartTime = Date.now();
    const result = await suiService.updateEngagementMetrics(ipTokenId, metrics);
    const updateDuration = Date.now() - updateStartTime;
    
    if (metricsCollector) {
      metricsCollector.recordOperation('oracle', 'update', updateDuration, true);
      metricsCollector.counters.oracle.onChainUpdates += 1;
    }

    res.json({
      success: true,
      ipTokenId,
      metrics,
      transaction: result,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    if (metricsCollector) {
      metricsCollector.recordOperation('oracle', 'update', duration, false);
    }
    next(error);
  }
});

// Trigger update for all IP tokens
router.post('/update-all', async (req, res, next) => {
  try {
    logger.info('Triggering update for all IP tokens');

    // TODO: Get all IP tokens from smart contract or config
    const ipTokens = []; // Placeholder

    const results = [];

    for (const ipTokenId of ipTokens) {
      try {
        const contributions = await indexerService.queryContributionsByIP(ipTokenId);
        const verified = await verificationService.verifyContributions(contributions);
        const metrics = aggregationService.aggregateMetrics(verified);
        const result = await suiService.updateEngagementMetrics(ipTokenId, metrics);

        results.push({
          ipTokenId,
          success: true,
          result,
        });
      } catch (error) {
        logger.error(`Failed to update ${ipTokenId}:`, error);
        results.push({
          ipTokenId,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      updated: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

