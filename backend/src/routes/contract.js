import express from 'express';
import { contractService } from '../services/contract.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ============================================================================
// TOKEN ROUTES
// ============================================================================

/**
 * Create a new IP token
 * POST /contract/tokens
 */
router.post('/tokens', async (req, res, next) => {
  try {
    const { name, symbol, description, category, reservePoolSize } = req.body;

    if (!name || !symbol || !description || category === undefined || reservePoolSize === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, symbol, description, category, reservePoolSize',
      });
    }

    const result = await contractService.createIPToken({
      name,
      symbol,
      description,
      category: parseInt(category),
      reservePoolSize: parseInt(reservePoolSize),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get token information
 * GET /contract/tokens/:tokenId
 */
router.get('/tokens/:tokenId', async (req, res, next) => {
  try {
    const { tokenId } = req.params;
    const info = await contractService.getTokenInfo(tokenId);

    res.json({
      success: true,
      tokenId,
      info,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all tokens
 * GET /contract/tokens
 */
router.get('/tokens', async (req, res, next) => {
  try {
    const tokens = await contractService.getAllTokens();

    res.json({
      success: true,
      tokens,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update reserve pool
 * PUT /contract/tokens/:tokenId/reserve
 */
router.put('/tokens/:tokenId/reserve', async (req, res, next) => {
  try {
    const { tokenId } = req.params;
    const { newReserveSize } = req.body;

    if (newReserveSize === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: newReserveSize',
      });
    }

    const result = await contractService.updateReservePool(tokenId, parseInt(newReserveSize));

    res.json({
      success: true,
      tokenId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// MARKETPLACE ROUTES
// ============================================================================

/**
 * Create a buy order
 * POST /contract/marketplace/buy
 */
router.post('/marketplace/buy', async (req, res, next) => {
  try {
    const { ipTokenId, price, quantity, paymentCoinId } = req.body;

    if (!ipTokenId || !price || !quantity || !paymentCoinId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipTokenId, price, quantity, paymentCoinId',
      });
    }

    const result = await contractService.createBuyOrder({
      ipTokenId,
      price: parseInt(price),
      quantity: parseInt(quantity),
      paymentCoinId,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a sell order
 * POST /contract/marketplace/sell
 */
router.post('/marketplace/sell', async (req, res, next) => {
  try {
    const { ipTokenId, price, quantity } = req.body;

    if (!ipTokenId || !price || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipTokenId, price, quantity',
      });
    }

    const result = await contractService.createSellOrder({
      ipTokenId,
      price: parseInt(price),
      quantity: parseInt(quantity),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Execute a buy order
 * POST /contract/marketplace/orders/:orderId/execute-buy
 */
router.post('/marketplace/orders/:orderId/execute-buy', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const result = await contractService.executeBuyOrder(orderId);

    res.json({
      success: true,
      orderId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Execute a sell order
 * POST /contract/marketplace/orders/:orderId/execute-sell
 */
router.post('/marketplace/orders/:orderId/execute-sell', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const result = await contractService.executeSellOrder(orderId);

    res.json({
      success: true,
      orderId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel an order
 * POST /contract/marketplace/orders/:orderId/cancel
 */
router.post('/marketplace/orders/:orderId/cancel', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const result = await contractService.cancelOrder(orderId);

    res.json({
      success: true,
      orderId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ORACLE ROUTES
// ============================================================================

/**
 * Initialize token price
 * POST /contract/oracle/initialize-price
 */
router.post('/oracle/initialize-price', async (req, res, next) => {
  try {
    const { ipTokenId, basePrice } = req.body;

    if (!ipTokenId || basePrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipTokenId, basePrice',
      });
    }

    const result = await contractService.initializeTokenPrice(ipTokenId, parseInt(basePrice));

    res.json({
      success: true,
      ipTokenId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update engagement metrics
 * POST /contract/oracle/update-metrics
 */
router.post('/oracle/update-metrics', async (req, res, next) => {
  try {
    const { ipTokenId, averageRating, totalContributors, totalEngagements, predictionAccuracy, growthRate } = req.body;

    if (!ipTokenId || averageRating === undefined || totalContributors === undefined || 
        totalEngagements === undefined || predictionAccuracy === undefined || growthRate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipTokenId, averageRating, totalContributors, totalEngagements, predictionAccuracy, growthRate',
      });
    }

    const result = await contractService.updateEngagementMetrics({
      ipTokenId,
      averageRating: parseInt(averageRating),
      totalContributors: parseInt(totalContributors),
      totalEngagements: parseInt(totalEngagements),
      predictionAccuracy: parseInt(predictionAccuracy),
      growthRate: parseInt(growthRate),
    });

    res.json({
      success: true,
      ipTokenId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get price for an IP token
 * GET /contract/oracle/price/:ipTokenId
 */
router.get('/oracle/price/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    const price = await contractService.getPrice(ipTokenId);

    res.json({
      success: true,
      ipTokenId,
      price,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get engagement metrics
 * GET /contract/oracle/metrics/:ipTokenId
 */
router.get('/oracle/metrics/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    const metrics = await contractService.getEngagementMetrics(ipTokenId);

    res.json({
      success: true,
      ipTokenId,
      metrics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Recalculate price
 * POST /contract/oracle/recalculate/:ipTokenId
 */
router.post('/oracle/recalculate/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    const result = await contractService.recalculatePrice(ipTokenId);

    res.json({
      success: true,
      ipTokenId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// REWARDS ROUTES
// ============================================================================

/**
 * Register engagement
 * POST /contract/rewards/register
 */
router.post('/rewards/register', async (req, res, next) => {
  try {
    const { ipTokenId, userAddress, rating, engagementType } = req.body;

    if (!ipTokenId || !userAddress || rating === undefined || engagementType === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipTokenId, userAddress, rating, engagementType',
      });
    }

    const result = await contractService.registerEngagement({
      ipTokenId,
      userAddress,
      rating: parseInt(rating),
      engagementType: parseInt(engagementType),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Distribute reward
 * POST /contract/rewards/distribute
 */
router.post('/rewards/distribute', async (req, res, next) => {
  try {
    const { ipTokenId, userAddress, reason } = req.body;

    if (!ipTokenId || !userAddress || reason === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipTokenId, userAddress, reason',
      });
    }

    const result = await contractService.distributeReward({
      ipTokenId,
      userAddress,
      reason: parseInt(reason),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get contributor record
 * GET /contract/rewards/contributor/:ipTokenId/:userAddress
 */
router.get('/rewards/contributor/:ipTokenId/:userAddress', async (req, res, next) => {
  try {
    const { ipTokenId, userAddress } = req.params;
    const contributor = await contractService.getContributor(ipTokenId, userAddress);

    res.json({
      success: true,
      ipTokenId,
      userAddress,
      contributor,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get contributor count
 * GET /contract/rewards/contributors/:ipTokenId
 */
router.get('/rewards/contributors/:ipTokenId', async (req, res, next) => {
  try {
    const { ipTokenId } = req.params;
    const count = await contractService.getContributorCount(ipTokenId);

    res.json({
      success: true,
      ipTokenId,
      count,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ROUTES
// ============================================================================

/**
 * Get object details
 * GET /contract/objects/:objectId
 */
router.get('/objects/:objectId', async (req, res, next) => {
  try {
    const { objectId } = req.params;
    const object = await contractService.getObject(objectId);

    res.json({
      success: true,
      objectId,
      object,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

