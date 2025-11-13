import express from 'express';
import { logger } from '../utils/logger.js';
import { WalrusService } from '../services/walrus.js';

const router = express.Router();
const walrusService = new WalrusService();

// Store a blob
router.post('/store', async (req, res, next) => {
  try {
    const { data, deletable, epochs } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required',
      });
    }

    logger.info('Storing blob on Walrus...');

    const result = await walrusService.storeBlob(data, {
      deletable: deletable || false,
      epochs: epochs || null,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// Read a blob
router.get('/read/:blobId', async (req, res, next) => {
  try {
    const { blobId } = req.params;

    logger.info(`Reading blob: ${blobId}`);

    const data = await walrusService.readBlob(blobId);

    // Return as base64 or raw depending on content type
    const base64 = data.toString('base64');
    
    res.json({
      success: true,
      blobId,
      data: base64,
      size: data.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get blob status
router.get('/status/:blobId', async (req, res, next) => {
  try {
    const { blobId } = req.params;

    logger.info(`Getting blob status: ${blobId}`);

    const status = await walrusService.getBlobStatus(blobId);

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    next(error);
  }
});

// Store a contribution (ODX-specific)
router.post('/contribution', async (req, res, next) => {
  try {
    const contribution = req.body;

    if (!contribution.ip_token_id) {
      return res.status(400).json({
        success: false,
        error: 'ip_token_id is required',
      });
    }

    logger.info(`Storing contribution for IP token: ${contribution.ip_token_id}`);

    const stored = await walrusService.storeContribution(contribution);

    res.json({
      success: true,
      contribution: stored,
    });
  } catch (error) {
    next(error);
  }
});

// Read a contribution
router.get('/contribution/:blobId', async (req, res, next) => {
  try {
    const { blobId } = req.params;

    logger.info(`Reading contribution: ${blobId}`);

    const contribution = await walrusService.readContribution(blobId);

    res.json({
      success: true,
      contribution,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

