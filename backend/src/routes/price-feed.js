/**
 * Price Feed Routes
 * 
 * Provides REST API and WebSocket endpoints for price feeds
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import { PriceFeedService } from '../services/price-feed.js';

const router = express.Router();
const priceFeedService = new PriceFeedService();

// Start the price feed service
priceFeedService.start();

/**
 * GET /api/price-feed/current/:ipTokenId
 * Get current price for a specific token
 */
router.get('/current/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    
    const priceData = priceFeedService.getCurrentPrice(ipTokenId);
    
    if (!priceData) {
      return res.status(404).json({
        success: false,
        error: 'Price data not found for this token',
      });
    }
    
    res.json({
      success: true,
      ipTokenId,
      price: priceData.price,
      timestamp: priceData.timestamp,
      ohlc: priceData.ohlc,
      metrics: priceData.metrics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/price-feed/current
 * Get current prices for all tokens
 */
router.get('/current', async (req, res, next) => {
  try {
    const prices = Array.from(priceFeedService.currentPrices.entries()).map(([ipTokenId, data]) => ({
      ipTokenId,
      price: data.price,
      timestamp: data.timestamp,
      ohlc: data.ohlc,
    }));
    
    res.json({
      success: true,
      prices,
      count: prices.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/price-feed/history/:ipTokenId
 * Get price history for a token
 */
router.get('/history/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const history = priceFeedService.getPriceHistory(ipTokenId, limit);
    
    res.json({
      success: true,
      ipTokenId,
      history,
      count: history.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/price-feed/ohlc/:ipTokenId
 * Get OHLC data for a token
 */
router.get('/ohlc/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    
    const ohlc = priceFeedService.getOHLC(ipTokenId);
    
    if (!ohlc) {
      return res.status(404).json({
        success: false,
        error: 'OHLC data not found for this token',
      });
    }
    
    res.json({
      success: true,
      ipTokenId,
      ohlc,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/price-feed/update/:ipTokenId
 * Manually trigger price update for a token
 */
router.post('/update/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Token name is required',
      });
    }
    
    const result = await priceFeedService.updatePriceForToken(ipTokenId, name);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/price-feed/update-all
 * Manually trigger price update for all tokens
 */
router.post('/update-all', async (req, res, next) => {
  try {
    const result = await priceFeedService.updateAllPrices();
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/price-feed/init
 * Initialize prices for all tokens (useful for first-time setup)
 */
router.get('/init', async (req, res, next) => {
  try {
    logger.info('Manual price feed initialization triggered');
    const result = await priceFeedService.updateAllPrices();
    
    res.json({
      success: true,
      message: 'Price feed initialized',
      ...result,
    });
  } catch (error) {
    logger.error('Error initializing price feed:', error);
    next(error);
  }
});

/**
 * GET /api/price-feed/config
 * Get price feed configuration
 */
router.get('/config', async (req, res) => {
  res.json({
    success: true,
    config: priceFeedService.config,
  });
});

/**
 * POST /api/price-feed/config
 * Update price feed configuration
 */
router.post('/config', async (req, res, next) => {
  try {
    const newConfig = req.body;
    priceFeedService.updateConfig(newConfig);
    
    res.json({
      success: true,
      message: 'Configuration updated',
      config: priceFeedService.config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/price-feed/stream
 * Server-Sent Events (SSE) stream for real-time price updates
 */
router.get('/stream', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Price feed stream connected' })}\n\n`);
  
  // Create a listener function
  const listener = (prices) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'price_update', data: prices })}\n\n`);
    } catch (error) {
      logger.error('Error sending SSE message:', error);
      // Remove listener and close connection
      priceFeedService.removeSSEConnection(res);
      res.end();
    }
  };
  
  // Add SSE connection to price feed service
  priceFeedService.addSSEConnection(res, listener);
  
  // Send current prices immediately (ensure ipTokenId is included)
  const currentPrices = Array.from(priceFeedService.currentPrices.entries()).map(([ipTokenId, data]) => ({
    ipTokenId: ipTokenId, // Explicitly include ipTokenId
    price: data.price,
    timestamp: data.timestamp,
    ohlc: data.ohlc || {
      open: data.price,
      high: data.price,
      low: data.price,
      close: data.price,
      timestamp: data.timestamp,
    },
  }));
  
  if (currentPrices.length > 0) {
    res.write(`data: ${JSON.stringify({ type: 'price_update', data: currentPrices })}\n\n`);
  } else {
    // If no prices yet, trigger an update
    logger.info('No current prices available, triggering initial update...');
    priceFeedService.updateAllPrices().catch(err => {
      logger.error('Error in initial price update for SSE:', err);
    });
  }
  
  // Handle client disconnect
  req.on('close', () => {
    logger.info('SSE client disconnected');
    priceFeedService.removeSSEConnection(res);
    res.end();
  });
});

// Export service for WebSocket setup
export { priceFeedService };
export default router;

