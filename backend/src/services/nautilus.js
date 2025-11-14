/**
 * Nautilus Oracle Service
 * 
 * Integrates with Nautilus enclave to fetch and verify external fandom data
 * from sources like MyAnimeList, AniList, MangaDex, etc.
 * 
 * The Nautilus enclave:
 * 1. Fetches data from external APIs
 * 2. Signs the data cryptographically
 * 3. Returns signed metrics that can be verified on-chain
 * 
 * Reference: https://github.com/mystenlabs/nautilus
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';

export class NautilusService {
  constructor() {
    // Nautilus enclave URL (configured via environment)
    this.enclaveUrl = config.nautilus.enclaveUrl;
    
    // Enclave public key (for verification)
    this.enclavePublicKey = config.nautilus.enclavePublicKey;
    
    // Timeout for enclave requests (ms)
    this.timeout = config.nautilus.timeout;
    
    // Enabled flag
    this.enabled = config.nautilus.enabled;
    
    // Metrics collector (optional)
    this.metricsCollector = null;
  }

  /**
   * Set metrics collector for tracking
   */
  setMetricsCollector(collector) {
    this.metricsCollector = collector;
  }

  /**
   * Health check for Nautilus enclave
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const startTime = Date.now();
    try {
      logger.info('Checking Nautilus enclave health...');

      const response = await fetch(`${this.enclaveUrl}/health_check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('nautilus', 'health_check', duration, true);
      }

      logger.info('Nautilus enclave is healthy');
      return {
        healthy: true,
        publicKey: data.pk,
        endpointsStatus: data.endpoints_status || {},
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('nautilus', 'health_check', duration, false);
      }
      logger.error('Nautilus health check failed:', error);
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Get attestation document from Nautilus enclave
   * Used for on-chain registration
   * @returns {Promise<Object>} Attestation document
   */
  async getAttestation() {
    const startTime = Date.now();
    try {
      logger.info('Getting Nautilus attestation document...');

      const response = await fetch(`${this.enclaveUrl}/get_attestation`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Failed to get attestation: ${response.statusText}`);
      }

      const attestation = await response.json();
      const duration = Date.now() - startTime;

      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('nautilus', 'get_attestation', duration, true);
      }

      logger.info('Attestation document retrieved');
      return attestation;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('nautilus', 'get_attestation', duration, false);
      }
      logger.error('Failed to get attestation:', error);
      throw new Error(`Failed to get Nautilus attestation: ${error.message}`);
    }
  }

  /**
   * Fetch external fandom data for an IP token
   * Calls Nautilus enclave to fetch and sign data from external APIs
   * 
   * @param {Object} params - Parameters for data fetching
   * @param {string} params.ipTokenId - IP token ID
   * @param {string} params.name - IP name (e.g., "Chainsaw Man")
   * @param {string} params.source - Data source ('myanimelist', 'anilist', 'mangadex')
   * @returns {Promise<Object>} Signed metrics from Nautilus
   */
  async fetchExternalMetrics(params) {
    const startTime = Date.now();
    try {
      if (!this.enabled) {
        logger.debug('Nautilus integration is disabled.');
        return null;
      }

      const { ipTokenId, name, source = 'myanimelist' } = params;

      if (!this.enclaveUrl) {
        logger.error('Nautilus Enclave URL is not configured.');
        return null;
      }

      logger.info(`Fetching external metrics for ${name} from ${source} via Nautilus...`);

      // Prepare payload for Nautilus enclave
      // The enclave will fetch data from external APIs and sign it
      const payload = {
        payload: {
          ip_token_id: ipTokenId,
          name: name,
          source: source, // 'myanimelist', 'anilist', 'mangadex'
          timestamp: Date.now(),
        },
      };

      const response = await fetch(`${this.enclaveUrl}/process_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Nautilus request failed: ${response.statusText}`);
      }

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('nautilus', 'fetch_metrics', duration, true);
      }

      // Parse Nautilus response
      // Expected format:
      // {
      //   response: {
      //     intent: number,
      //     timestamp_ms: number,
      //     data: {
      //       average_rating: number,
      //       popularity_score: number,
      //       member_count: number,
      //       trending_score: number,
      //       ...
      //     }
      //   },
      //   signature: string
      // }
      const signedMetrics = {
        ipTokenId,
        name,
        source,
        metrics: result.response.data,
        signature: result.signature,
        timestamp: result.response.timestamp_ms,
        intent: result.response.intent,
      };

      logger.info(`External metrics fetched and signed for ${name}`);
      return signedMetrics;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.metricsCollector) {
        this.metricsCollector.recordOperation('nautilus', 'fetch_metrics', duration, false);
      }
      logger.error(`Failed to fetch external metrics for ${params.name}:`, error);
      throw new Error(`Failed to fetch external metrics: ${error.message}`);
    }
  }

  /**
   * Fetch metrics from multiple external sources
   * Aggregates data from MyAnimeList, AniList, etc.
   * 
   * @param {Object} params - Parameters
   * @param {string} params.ipTokenId - IP token ID
   * @param {string} params.name - IP name
   * @param {Array<string>} params.sources - List of sources to query
   * @returns {Promise<Array>} Array of signed metrics from each source
   */
  async fetchMultipleSources(params) {
    if (!this.enabled) {
      logger.debug('Nautilus integration is disabled.');
      return [];
    }

    const { ipTokenId, name, sources = ['myanimelist', 'anilist'] } = params;

    if (!sources || sources.length === 0) {
      logger.warn('No Nautilus sources provided.');
      return [];
    }

    logger.info(`Fetching metrics from multiple sources for ${name}: ${sources.join(', ')}`);

    const results = await Promise.allSettled(
      sources.map((source) =>
        this.fetchExternalMetrics({
          ipTokenId,
          name,
          source,
        })
      )
    );

    const successful = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    const failed = results
      .filter((r) => r.status === 'rejected')
      .map((r) => r.reason);

    if (failed.length > 0) {
      logger.warn(`${failed.length} source(s) failed to fetch metrics:`, failed);
    }

    logger.info(`Successfully fetched from ${successful.length}/${sources.length} sources`);
    return successful;
  }

  /**
   * Verify Nautilus signature
   * This should be done on-chain, but we can do a basic check here
   * 
   * @param {Object} signedData - Signed data from Nautilus
   * @returns {Promise<boolean>} True if signature appears valid
   */
  async verifySignature(signedData) {
    // Basic validation - full verification happens on-chain
    if (!signedData.signature || !signedData.metrics) {
      return false;
    }

    // Check signature format (should be hex string)
    if (!/^[0-9a-fA-F]+$/.test(signedData.signature)) {
      return false;
    }

    // Check timestamp is recent (within 1 hour)
    const age = Date.now() - signedData.timestamp;
    if (age > 60 * 60 * 1000) {
      logger.warn('Nautilus signature is older than 1 hour');
      return false;
    }

    // Full verification will be done on-chain using Nautilus Move module
    return true;
  }
}

