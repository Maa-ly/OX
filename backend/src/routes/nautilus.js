/**
 * Nautilus Oracle Routes
 * 
 * Endpoints for interacting with Nautilus enclave for external data verification
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import { NautilusService } from '../services/nautilus.js';

const router = express.Router();
const nautilusService = new NautilusService();

// Metrics collector will be set by server.js
let metricsCollector = null;
export function setMetricsCollector(collector) {
  metricsCollector = collector;
  nautilusService.setMetricsCollector(collector);
}

/**
 * GET /api/nautilus/health
 * Health check for Nautilus enclave
 */
router.get('/health', async (req, res, next) => {
  try {
    const health = await nautilusService.healthCheck();
    res.json({
      success: true,
      ...health,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/nautilus/attestation
 * Get attestation document from Nautilus enclave
 * Used for on-chain registration
 */
router.get('/attestation', async (req, res, next) => {
  try {
    const attestation = await nautilusService.getAttestation();
    res.json({
      success: true,
      attestation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/nautilus/fetch-metrics
 * Fetch external metrics for an IP token via Nautilus
 * 
 * Request body:
 * {
 *   "ipTokenId": "0x...",
 *   "name": "Chainsaw Man",
 *   "source": "myanimelist" // optional, defaults to 'myanimelist'
 * }
 */
router.post('/fetch-metrics', async (req, res, next) => {
  try {
    const { ipTokenId, name, source } = req.body;

    if (!ipTokenId || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipTokenId, name',
      });
    }

    const metrics = await nautilusService.fetchExternalMetrics({
      ipTokenId,
      name,
      source: source || 'myanimelist',
    });

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/nautilus/fetch-multiple
 * Fetch metrics from multiple external sources
 * 
 * Request body:
 * {
 *   "ipTokenId": "0x...",
 *   "name": "Chainsaw Man",
 *   "sources": ["myanimelist", "anilist"] // optional
 * }
 */
router.post('/fetch-multiple', async (req, res, next) => {
  try {
    const { ipTokenId, name, sources } = req.body;

    if (!ipTokenId || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipTokenId, name',
      });
    }

    const metrics = await nautilusService.fetchMultipleSources({
      ipTokenId,
      name,
      sources: sources || ['myanimelist', 'anilist'],
    });

    res.json({
      success: true,
      metrics,
      count: metrics.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/nautilus/verify
 * Verify a Nautilus signature (basic check, full verification on-chain)
 * 
 * Request body:
 * {
 *   "signedData": { ... } // Signed metrics from Nautilus
 * }
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { signedData } = req.body;

    if (!signedData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: signedData',
      });
    }

    const isValid = await nautilusService.verifySignature(signedData);

    res.json({
      success: true,
      valid: isValid,
      note: 'Full verification happens on-chain via smart contract',
    });
  } catch (error) {
    next(error);
  }
});

export default router;


