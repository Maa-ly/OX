import express from 'express';
import { logger } from '../utils/logger.js';
import { NautilusService } from '../services/nautilus.js';

const router = express.Router();
const nautilusService = new NautilusService();

let metricsCollector = null;
export function setMetricsCollector(collector) {
  metricsCollector = collector;
  nautilusService.setMetricsCollector(collector);
}


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

