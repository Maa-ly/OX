import express from 'express';
import { logger } from '../utils/logger.js';
import { WalrusService } from '../services/walrus.js';
import { WalrusIndexerService } from '../services/walrus-indexer.js';
import { VerificationService } from '../services/verification.js';
import { AggregationService } from '../services/aggregation.js';
import { SuiService } from '../services/sui.js';
import { NautilusService } from '../services/nautilus.js';

const router = express.Router();
const walrusService = new WalrusService();
const indexerService = new WalrusIndexerService();
const verificationService = new VerificationService();
const aggregationService = new AggregationService();
const suiService = new SuiService();
const nautilusService = new NautilusService();

// Metrics collector will be set by server.js
let metricsCollector = null;
export function setMetricsCollector(collector) {
  metricsCollector = collector;
  walrusService.setMetricsCollector(collector);
  nautilusService.setMetricsCollector(collector);
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

// Index a contribution that was already stored on Walrus by the user
// Users now store directly using the Walrus SDK and pay with their own WAL tokens
router.post('/index-contribution', async (req, res, next) => {
  try {
    const { blobId, contribution } = req.body;

    if (!blobId) {
      return res.status(400).json({
        success: false,
        error: 'blobId is required',
      });
    }

    if (!contribution?.ip_token_id) {
      return res.status(400).json({
        success: false,
        error: 'contribution.ip_token_id is required',
      });
    }

    logger.info(`Indexing contribution for IP token: ${contribution.ip_token_id}, blobId: ${blobId}`);

    // Index the contribution (already stored on Walrus by user)
    await indexerService.indexContribution(
      contribution.ip_token_id,
      blobId,
      {
        engagement_type: contribution.engagement_type,
        timestamp: contribution.timestamp || Date.now(),
        user_wallet: contribution.user_wallet,
        signature: contribution.signature,
        ...contribution,
      }
    );

    if (metricsCollector) {
      metricsCollector.counters.oracle.contributionsStored += 1;
    }

    res.json({
      success: true,
      blobId,
      indexed: true,
      contribution: {
        ...contribution,
        walrus_blob_id: blobId,
        walrus_cid: blobId,
        blobId,
      },
    });
  } catch (error) {
    if (metricsCollector) {
      metricsCollector.counters.oracle.contributionErrors += 1;
    }
    next(error);
  }
});

// Store a new contribution (LEGACY - kept for backward compatibility)
// NOTE: This endpoint now only indexes. Frontend should use Walrus SDK directly to store.
router.post('/contributions', async (req, res, next) => {
  try {
    const contribution = req.body;

    if (!contribution.ip_token_id) {
      return res.status(400).json({
        success: false,
        error: 'ip_token_id is required',
      });
    }

    logger.warn(`Deprecated: /contributions endpoint called. Frontend should use Walrus SDK directly.`);
    logger.error(`Backend storage is disabled. Users must store contributions using the Walrus TypeScript SDK on the frontend.`);
    
    // Backend no longer stores contributions - users must use the SDK
    // Frontend should:
    // 1. Store using storeContributionWithUserWallet from @/lib/utils/walrus-sdk
    // 2. Then call /api/oracle/index-contribution with the blobId
    return res.status(400).json({
      success: false,
      error: 'Backend storage is disabled. Please use the Walrus TypeScript SDK on the frontend to store contributions. Users must pay with WAL tokens from their own wallets.',
      details: 'Use storeContributionWithUserWallet from @/lib/utils/walrus-sdk in the frontend instead. Then call /api/oracle/index-contribution to index the stored contribution.',
      fix: 'The frontend should use the TypeScript SDK (storeContributionWithUserWallet) to store directly on Walrus, then call /api/oracle/index-contribution with the blobId.',
    });

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
// Combines Walrus (user contributions) + Nautilus (external truth)
router.get('/metrics/:ipTokenId', async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { ipTokenId } = req.params;
    const { includeExternal = 'true', name } = req.query; // Include Nautilus data by default

    logger.info(`Aggregating metrics for IP token: ${ipTokenId} (includeExternal: ${includeExternal})`);

    // 1. Query contributions from Walrus (via indexer)
    const contributions = await indexerService.queryContributionsByIP(ipTokenId);

    // 2. Verify signatures
    const verified = await verificationService.verifyContributions(contributions);
    
    if (metricsCollector) {
      metricsCollector.counters.verification.verified += verified.length;
      metricsCollector.counters.verification.failed += (contributions.length - verified.length);
    }

    // 3. Aggregate user metrics from Walrus
    const walrusMetrics = aggregationService.aggregateMetrics(verified);

    // 4. Fetch external metrics from Nautilus (if enabled)
    let nautilusMetrics = [];
    if (includeExternal === 'true') {
      try {
        // TODO: Get IP token name from contract or cache
        // For now, we'll need to pass it as a query param or fetch from contract
        if (name) {
          nautilusMetrics = await nautilusService.fetchMultipleSources({
            ipTokenId,
            name,
            sources: ['myanimelist', 'anilist'], // Can be configured
          });
        } else {
          logger.warn('IP token name not provided, skipping Nautilus fetch');
        }
      } catch (error) {
        logger.warn('Failed to fetch Nautilus metrics, using Walrus only:', error.message);
        // Continue with Walrus-only metrics if Nautilus fails
      }
    }

    // 5. Combine Walrus + Nautilus metrics
    const combinedMetrics = aggregationService.combineMetrics(walrusMetrics, nautilusMetrics);
    
    const duration = Date.now() - startTime;
    if (metricsCollector) {
      metricsCollector.recordOperation('oracle', 'aggregate', duration, true);
      metricsCollector.counters.oracle.metricsCalculated += 1;
      metricsCollector.counters.aggregation.performed += 1;
    }

    res.json({
      success: true,
      ipTokenId,
      metrics: combinedMetrics,
      sources: {
        walrus: {
          totalContributions: contributions.length,
          verifiedContributions: verified.length,
          invalidContributions: contributions.length - verified.length,
        },
        nautilus: {
          sourcesQueried: nautilusMetrics.length,
          sources: nautilusMetrics.map((m) => m.source),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update metrics on-chain
// Combines Walrus + Nautilus data before updating
router.post('/update/:ipTokenId', async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { ipTokenId } = req.params;
    const { force, includeExternal = 'true', name } = req.query;

    logger.info(`Updating on-chain metrics for IP token: ${ipTokenId} (includeExternal: ${includeExternal})`);

    // 1. Query contributions from Walrus (via indexer)
    const contributions = await indexerService.queryContributionsByIP(ipTokenId);

    // 2. Verify signatures
    const verified = await verificationService.verifyContributions(contributions);

    // 3. Aggregate user metrics from Walrus
    const walrusMetrics = aggregationService.aggregateMetrics(verified);

    // 4. Fetch external metrics from Nautilus (if enabled)
    let nautilusMetrics = [];
    if (includeExternal === 'true' && name) {
      try {
        nautilusMetrics = await nautilusService.fetchMultipleSources({
          ipTokenId,
          name,
          sources: ['myanimelist', 'anilist'],
        });
      } catch (error) {
        logger.warn('Failed to fetch Nautilus metrics, using Walrus only:', error.message);
      }
    }

    // 5. Combine Walrus + Nautilus metrics
    const combinedMetrics = aggregationService.combineMetrics(walrusMetrics, nautilusMetrics);

    // 6. Update on-chain with combined metrics
    // Note: Smart contract will verify Nautilus signatures on-chain
    const updateStartTime = Date.now();
    const result = await suiService.updateEngagementMetrics(ipTokenId, combinedMetrics, nautilusMetrics);
    const updateDuration = Date.now() - updateStartTime;
    
    if (metricsCollector) {
      metricsCollector.recordOperation('oracle', 'update', updateDuration, true);
      metricsCollector.counters.oracle.onChainUpdates += 1;
    }

    res.json({
      success: true,
      ipTokenId,
      metrics: combinedMetrics,
      transaction: result,
      sources: {
        walrus: {
          contributions: verified.length,
        },
        nautilus: {
          sources: nautilusMetrics.length,
        },
      },
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

