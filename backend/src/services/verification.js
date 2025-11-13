import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { logger } from '../utils/logger.js';

export class VerificationService {
  /**
   * Verify a single contribution's signature
   * @param {Object} contribution - Contribution object with signature
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verifyContribution(contribution) {
    try {
      if (!contribution.signature || !contribution.user_wallet) {
        logger.warn('Contribution missing signature or wallet address');
        return false;
      }

      // Reconstruct the message that was signed
      const dataToVerify = { ...contribution };
      delete dataToVerify.signature;
      delete dataToVerify.walrus_cid; // CID is added after signing

      const message = JSON.stringify(dataToVerify);
      const messageBytes = new TextEncoder().encode(message);

      // Verify signature using Sui's personal message signature verification
      // Returns PublicKey if valid, throws error if invalid
      try {
        const publicKey = await verifyPersonalMessageSignature(
          messageBytes,
          contribution.signature,
          {
            address: contribution.user_wallet,
          }
        );

        // Signature is valid if PublicKey is returned
        return !!publicKey;
      } catch (error) {
        // Signature verification failed
        logger.warn(`Invalid signature for contribution from ${contribution.user_wallet}: ${error.message}`);
        return false;
      }
    } catch (error) {
      logger.error('Error verifying contribution:', error);
      return false;
    }
  }

  /**
   * Verify multiple contributions
   * @param {Array} contributions - Array of contribution objects
   * @returns {Promise<Array>} Array of verified contributions
   */
  async verifyContributions(contributions) {
    logger.info(`Verifying ${contributions.length} contributions...`);

    const verificationResults = await Promise.all(
      contributions.map(async (contribution) => {
        const isValid = await this.verifyContribution(contribution);
        return { contribution, isValid };
      })
    );

    const verified = verificationResults
      .filter((result) => result.isValid)
      .map((result) => result.contribution);

    const invalidCount = contributions.length - verified.length;
    if (invalidCount > 0) {
      logger.warn(`Rejected ${invalidCount} contributions with invalid signatures`);
    }

    logger.info(`Verified ${verified.length}/${contributions.length} contributions`);
    return verified;
  }
}

