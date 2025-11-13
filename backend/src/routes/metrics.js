import express from 'express';
import { logger } from '../utils/logger.js';
import { MetricsCollectorService } from '../services/metrics-collector.js';

const router = express.Router();
const metricsCollector = new MetricsCollectorService();

// Get all service metrics
router.get('/', async (req, res, next) => {
  try {
    logger.debug('Collecting metrics...');
    const metrics = await metricsCollector.getAllMetrics();
    res.json({
      success: true,
      ...metrics,
    });
  } catch (error) {
    next(error);
  }
});

// Get system metrics only
router.get('/system', (req, res) => {
  const metrics = metricsCollector.getSystemMetrics();
  res.json({
    success: true,
    metrics,
  });
});

// Get Walrus metrics only
router.get('/walrus', async (req, res, next) => {
  try {
    const metrics = await metricsCollector.getWalrusMetrics();
    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    next(error);
  }
});

// Get Sui metrics only
router.get('/sui', async (req, res, next) => {
  try {
    const metrics = await metricsCollector.getSuiMetrics();
    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    next(error);
  }
});

// Get Oracle metrics only
router.get('/oracle', (req, res) => {
  const metrics = metricsCollector.getOracleMetrics();
  res.json({
    success: true,
    metrics,
  });
});

// Get contribution metrics only
router.get('/contributions', async (req, res, next) => {
  try {
    const metrics = await metricsCollector.getContributionMetrics();
    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

