import { contractService } from './contract.js';
import { logger } from '../utils/logger.js';

/**
 * SuiService - Legacy wrapper for backward compatibility
 * Now delegates to ContractService
 */
export class SuiService {
  constructor() {
    this.contractService = contractService;
  }

  /**
   * Update engagement metrics on-chain
   * @param {string} ipTokenId - IP token ID
   * @param {Object} metrics - Aggregated metrics
   * @returns {Promise<Object>} Transaction result
   */
  async updateEngagementMetrics(ipTokenId, metrics) {
    try {
      return await this.contractService.updateEngagementMetrics({
        ipTokenId,
        averageRating: metrics.average_rating,
        totalContributors: metrics.total_contributors,
        totalEngagements: metrics.total_engagements,
        predictionAccuracy: metrics.prediction_accuracy,
        growthRate: metrics.growth_rate,
      });
    } catch (error) {
      logger.error('Error updating on-chain metrics:', error);
      throw error;
    }
  }

  /**
   * Get current engagement metrics from on-chain
   * @param {string} ipTokenId - IP token ID
   * @returns {Promise<Object>} Current metrics
   */
  async getEngagementMetrics(ipTokenId) {
    try {
      return await this.contractService.getEngagementMetrics(ipTokenId);
    } catch (error) {
      logger.error('Error getting on-chain metrics:', error);
      throw error;
    }
  }
}

