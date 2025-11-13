import express from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { HealthCheckerService } from '../services/health-checker.js';

const router = express.Router();
const healthChecker = new HealthCheckerService();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ODX Oracle Service',
    version: '1.0.0',
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    logger.info('Performing detailed health check...');

    // Perform all health checks
    const healthChecks = await healthChecker.performAllChecks();

    const health = {
      status: healthChecks.overall.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ODX Oracle Service',
      version: '1.0.0',
      config: {
        suiNetwork: config.sui.network,
        walrusContext: config.walrus.context,
        updateInterval: config.update.interval,
      },
      checks: {
        walrus: {
          healthy: healthChecks.walrus.healthy,
          checks: healthChecks.walrus.checks || {},
          errors: healthChecks.walrus.errors || [],
        },
        sui: {
          healthy: healthChecks.sui.healthy,
          checks: healthChecks.sui.checks || {},
          details: healthChecks.sui.details || {},
          errors: healthChecks.sui.errors || [],
        },
        config: {
          healthy: healthChecks.config.healthy,
          checks: healthChecks.config.checks || {},
          errors: healthChecks.config.errors || [],
        },
      },
    };

    // Set status code based on health
    const statusCode = healthChecks.overall.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Quick health check (just basic connectivity)
router.get('/quick', async (req, res) => {
  try {
    const [walrus, sui] = await Promise.allSettled([
      healthChecker.checkWalrus(),
      healthChecker.checkSui(),
    ]);

    const healthy = 
      (walrus.status === 'fulfilled' && walrus.value.healthy) &&
      (sui.status === 'fulfilled' && sui.value.healthy);

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      walrus: walrus.status === 'fulfilled' ? walrus.value.healthy : false,
      sui: sui.status === 'fulfilled' ? sui.value.healthy : false,
    });
  } catch (error) {
    logger.error('Quick health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;

