import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export class SuiService {
  constructor() {
    this.client = new SuiClient({ url: config.sui.rpcUrl });
    this.packageId = config.oracle.packageId;
    this.oracleObjectId = config.oracle.objectId;
    this.adminCapId = config.oracle.adminCapId;

    this.adminKeypair = null;
    try {
      const privateKey = process.env.ADMIN_PRIVATE_KEY;
      if (privateKey) {
        let bytes;
        if (privateKey.length === 64 && /^[0-9a-fA-F]+$/.test(privateKey)) {
          bytes = Buffer.from(privateKey, 'hex');
        } else {
          try {
            bytes = fromB64(privateKey);
          } catch {
            bytes = Buffer.from(privateKey, 'hex');
          }
        }
        if (bytes && bytes.length === 32) {
          this.adminKeypair = Ed25519Keypair.fromSecretKey(bytes);
          logger.info('Admin keypair loaded for SuiService');
        } else {
          logger.warn('Invalid ADMIN_PRIVATE_KEY length for SuiService');
        }
      }
    } catch (e) {
      logger.warn('Failed to load ADMIN_PRIVATE_KEY for SuiService:', e.message);
    }
  }

  /**
   * Update engagement metrics on-chain
   * @param {string} ipTokenId - IP token ID
   * @param {Object} metrics - Combined metrics (Walrus + Nautilus)
   * @param {Array} nautilusMetrics - Array of signed Nautilus metrics (for on-chain verification)
   * @returns {Promise<Object>} Transaction result
   */
  async updateEngagementMetrics(ipTokenId, metrics, nautilusMetrics = []) {
    try {
      if (!this.packageId || !this.oracleObjectId || !this.adminCapId) {
        throw new Error('Oracle configuration incomplete. Set PACKAGE_ID, ORACLE_OBJECT_ID, and ADMIN_CAP_ID in .env');
      }

      if (!this.adminKeypair || process.env.ENABLE_ONCHAIN !== 'true') {
        logger.warn('On-chain update disabled or admin key not configured; skipping on-chain update');
        return { digest: 'dry-run', skipped: true };
      }

      logger.info(`Updating on-chain metrics for IP token: ${ipTokenId} (with ${nautilusMetrics.length} Nautilus sources)`);

      const tx = new Transaction();

      // Use combined metrics for price calculation
      // The smart contract will verify Nautilus signatures on-chain
      const averageRating = metrics.combined_rating || metrics.user_average_rating || metrics.average_rating || 0;
      const totalContributors = metrics.user_total_contributors || metrics.total_contributors || 0;
      const totalEngagements = metrics.user_total_engagements || metrics.total_engagements || 0;
      const predictionAccuracy = metrics.user_prediction_accuracy || metrics.prediction_accuracy || 0;
      const growthRate = metrics.combined_growth_rate || metrics.user_growth_rate || metrics.growth_rate || 0;

      tx.moveCall({
        target: `${this.packageId}::oracle::update_engagement_metrics`,
        arguments: [
          tx.object(this.oracleObjectId),
          tx.object(this.adminCapId),
          ipTokenId,
          averageRating,
          totalContributors,
          totalEngagements,
          predictionAccuracy,
          growthRate,
        ],
      });

      // TODO: Add Nautilus signature verification in a separate transaction
      // This would call a function like `verify_nautilus_metrics()` in the oracle module
      // For now, we pass the combined metrics and the contract can verify later

      const result = await this.client.signAndExecuteTransaction({
        signer: this.adminKeypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      logger.info('Transaction successful:', result.digest);
      return result;
    } catch (error) {
      logger.error('Error updating on-chain metrics:', error);
      throw new Error(`Failed to update on-chain metrics: ${error.message}`);
    }
  }

  /**
   * Get current engagement metrics from on-chain
   * @param {string} ipTokenId - IP token ID
   * @returns {Promise<Object>} Current metrics
   */
  async getEngagementMetrics(ipTokenId) {
    try {
      // TODO: Implement reading metrics from on-chain
      // This would query the PriceOracle object
      throw new Error('Not implemented yet');
    } catch (error) {
      logger.error('Error getting on-chain metrics:', error);
      throw new Error(`Failed to get on-chain metrics: ${error.message}`);
    }
  }
}

