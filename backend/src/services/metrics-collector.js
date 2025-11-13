import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { WalrusService } from './walrus.js';
import { WalrusIndexerService } from './walrus-indexer.js';
import { SuiClient } from '@mysten/sui/client';

/**
 * Metrics Collector Service
 * 
 * Collects comprehensive metrics about:
 * - Service health and performance
 * - Walrus operations and storage
 * - Sui network status
 * - Contribution statistics
 * - System resources
 */
export class MetricsCollectorService {
  constructor() {
    this.startTime = Date.now();
    this.walrusService = new WalrusService();
    this.indexerService = new WalrusIndexerService();
    this.suiClient = new SuiClient({ url: config.sui.rpcUrl });
    
    // Operation counters
    this.counters = {
      walrus: {
        store: 0,
        read: 0,
        status: 0,
        errors: 0,
      },
      oracle: {
        contributionsQueried: 0,
        contributionsStored: 0,
        metricsCalculated: 0,
        onChainUpdates: 0,
        errors: 0,
      },
      verification: {
        verified: 0,
        failed: 0,
      },
      aggregation: {
        performed: 0,
        errors: 0,
      },
    };

    // Performance metrics
    this.performance = {
      walrus: {
        store: [],
        read: [],
        status: [],
      },
      oracle: {
        query: [],
        aggregate: [],
        update: [],
      },
    };

    // Cache for expensive operations
    this.cache = {
      suiNetworkInfo: null,
      suiNetworkInfoTime: 0,
      walrusInfo: null,
      walrusInfoTime: 0,
    };
  }

  /**
   * Record an operation
   */
  recordOperation(service, operation, duration, success = true) {
    if (success) {
      this.counters[service][operation] = (this.counters[service][operation] || 0) + 1;
    } else {
      this.counters[service].errors = (this.counters[service].errors || 0) + 1;
    }

    // Store performance data (keep last 100)
    if (duration !== undefined) {
      if (!this.performance[service]) {
        this.performance[service] = {};
      }
      if (!this.performance[service][operation]) {
        this.performance[service][operation] = [];
      }
      this.performance[service][operation].push(duration);
      if (this.performance[service][operation].length > 100) {
        this.performance[service][operation].shift();
      }
    }
  }

  /**
   * Calculate average duration for an operation
   */
  getAverageDuration(service, operation) {
    const durations = this.performance[service]?.[operation] || [];
    if (durations.length === 0) return 0;
    const sum = durations.reduce((a, b) => a + b, 0);
    return Math.round(sum / durations.length);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: Math.floor(process.uptime()),
      uptimeFormatted: this.formatUptime(process.uptime()),
      memory: {
        rss: usage.rss,
        rssFormatted: this.formatBytes(usage.rss),
        heapTotal: usage.heapTotal,
        heapTotalFormatted: this.formatBytes(usage.heapTotal),
        heapUsed: usage.heapUsed,
        heapUsedFormatted: this.formatBytes(usage.heapUsed),
        external: usage.external,
        externalFormatted: this.formatBytes(usage.external),
        usagePercent: Math.round((usage.heapUsed / usage.heapTotal) * 100),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      platform: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
    };
  }

  /**
   * Get Walrus metrics
   */
  async getWalrusMetrics() {
    const metrics = {
      operations: {
        store: {
          count: this.counters.walrus.store,
          averageDuration: this.getAverageDuration('walrus', 'store'),
        },
        read: {
          count: this.counters.walrus.read,
          averageDuration: this.getAverageDuration('walrus', 'read'),
        },
        status: {
          count: this.counters.walrus.status,
          averageDuration: this.getAverageDuration('walrus', 'status'),
        },
        errors: this.counters.walrus.errors,
      },
      config: {
        context: config.walrus.context,
        configPath: config.walrus.configPath,
      },
    };

    // Get Walrus info (cached for 60 seconds)
    try {
      const now = Date.now();
      if (!this.cache.walrusInfo || (now - this.cache.walrusInfoTime) > 60000) {
        // Try to get Walrus info via CLI
        // This is optional and may fail if binary not available
        this.cache.walrusInfo = null;
        this.cache.walrusInfoTime = now;
      }
    } catch (error) {
      logger.debug('Could not fetch Walrus info:', error.message);
    }

    return metrics;
  }

  /**
   * Get Sui network metrics
   */
  async getSuiMetrics() {
    const metrics = {
      network: config.sui.network,
      rpcUrl: config.sui.rpcUrl,
    };

    try {
      // Get network info (cached for 30 seconds)
      const now = Date.now();
      if (!this.cache.suiNetworkInfo || (now - this.cache.suiNetworkInfoTime) > 30000) {
        const [chainId, checkpoint, referenceGasPrice] = await Promise.allSettled([
          this.suiClient.getChainIdentifier(),
          this.suiClient.getLatestCheckpointSequenceNumber(),
          this.suiClient.getReferenceGasPrice(),
        ]);

        this.cache.suiNetworkInfo = {
          chainId: chainId.status === 'fulfilled' ? chainId.value : null,
          latestCheckpoint: checkpoint.status === 'fulfilled' ? checkpoint.value?.toString() : null,
          referenceGasPrice: referenceGasPrice.status === 'fulfilled' ? referenceGasPrice.value : null,
        };
        this.cache.suiNetworkInfoTime = now;
      }

      metrics.networkInfo = this.cache.suiNetworkInfo;
    } catch (error) {
      logger.debug('Could not fetch Sui network info:', error.message);
      metrics.networkInfo = null;
    }

    return metrics;
  }

  /**
   * Get Oracle metrics
   */
  getOracleMetrics() {
    return {
      operations: {
        contributionsQueried: this.counters.oracle.contributionsQueried,
        contributionsStored: this.counters.oracle.contributionsStored,
        metricsCalculated: this.counters.oracle.metricsCalculated,
        onChainUpdates: this.counters.oracle.onChainUpdates,
        errors: this.counters.oracle.errors,
      },
      performance: {
        query: {
          count: this.performance.oracle.query.length,
          averageDuration: this.getAverageDuration('oracle', 'query'),
        },
        aggregate: {
          count: this.performance.oracle.aggregate.length,
          averageDuration: this.getAverageDuration('oracle', 'aggregate'),
        },
        update: {
          count: this.performance.oracle.update.length,
          averageDuration: this.getAverageDuration('oracle', 'update'),
        },
      },
      config: {
        updateInterval: config.update.interval,
        updateIntervalFormatted: this.formatDuration(config.update.interval),
        oracleObjectId: config.oracle.objectId ? 'configured' : 'not configured',
        adminCapId: config.oracle.adminCapId ? 'configured' : 'not configured',
        packageId: config.oracle.packageId ? 'configured' : 'not configured',
      },
    };
  }

  /**
   * Get contribution statistics
   */
  async getContributionMetrics() {
    // Get index statistics
    const index = this.indexerService.index;
    const totalIndexed = Array.from(index.values()).reduce((sum, blobIds) => sum + blobIds.length, 0);
    const uniqueIPTokens = index.size;

    return {
      indexed: {
        totalContributions: totalIndexed,
        uniqueIPTokens,
        averagePerToken: uniqueIPTokens > 0 ? Math.round(totalIndexed / uniqueIPTokens) : 0,
      },
      verification: {
        verified: this.counters.verification.verified,
        failed: this.counters.verification.failed,
        successRate: this.counters.verification.verified + this.counters.verification.failed > 0
          ? Math.round((this.counters.verification.verified / (this.counters.verification.verified + this.counters.verification.failed)) * 100)
          : 0,
      },
      aggregation: {
        performed: this.counters.aggregation.performed,
        errors: this.counters.aggregation.errors,
      },
    };
  }

  /**
   * Get all metrics
   */
  async getAllMetrics() {
    const [system, walrus, sui, oracle, contributions] = await Promise.allSettled([
      Promise.resolve(this.getSystemMetrics()),
      this.getWalrusMetrics(),
      this.getSuiMetrics(),
      Promise.resolve(this.getOracleMetrics()),
      this.getContributionMetrics(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      service: {
        name: 'ODX Oracle Service',
        version: '1.0.0',
        startTime: new Date(this.startTime).toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      },
      system: system.status === 'fulfilled' ? system.value : null,
      walrus: walrus.status === 'fulfilled' ? walrus.value : null,
      sui: sui.status === 'fulfilled' ? sui.value : null,
      oracle: oracle.status === 'fulfilled' ? oracle.value : null,
      contributions: contributions.status === 'fulfilled' ? contributions.value : null,
    };
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }

  /**
   * Format uptime to human-readable string
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }
}

