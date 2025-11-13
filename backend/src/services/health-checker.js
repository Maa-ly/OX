import { SuiClient } from '@mysten/sui/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Health Checker Service
 * 
 * Performs actual connectivity and health checks for:
 * - Walrus (via CLI and system object)
 * - Sui (via RPC)
 * - Configuration validity
 */
export class HealthCheckerService {
  constructor() {
    this.suiClient = new SuiClient({ url: config.sui.rpcUrl });
    this.walrusPath = process.env.WALRUS_BINARY_PATH || 
      '~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus';
    this.configPath = config.walrus.configPath.replace('~', process.env.HOME || '');
    this.context = config.walrus.context;
  }

  /**
   * Check Walrus connectivity
   * 
   * Checks:
   * 1. Walrus binary exists and is executable
   * 2. Configuration file is valid
   * 3. Can query system object from Sui
   * 4. Can execute a simple Walrus command
   */
  async checkWalrus() {
    const result = {
      healthy: false,
      checks: {
        binary: false,
        config: false,
        systemObject: false,
        command: false,
      },
      errors: [],
    };

    try {
      // Check 1: Binary exists and is executable
      try {
        const { stdout } = await execAsync(`${this.walrusPath} --version`, {
          timeout: 5000,
        });
        if (stdout && stdout.includes('walrus')) {
          result.checks.binary = true;
        }
      } catch (error) {
        result.errors.push(`Binary check failed: ${error.message}`);
      }

      // Check 2: Configuration file exists and is valid
      try {
        const configContent = await readFile(this.configPath, 'utf-8');
        const yaml = await import('yaml');
        const configData = yaml.parse(configContent);
        
        if (configData.contexts?.[this.context]) {
          result.checks.config = true;
        } else {
          result.errors.push(`Context '${this.context}' not found in config`);
        }
      } catch (error) {
        result.errors.push(`Config check failed: ${error.message}`);
      }

      // Check 3: System object exists on Sui
      try {
        const configContent = await readFile(this.configPath, 'utf-8');
        const yaml = await import('yaml');
        const configData = yaml.parse(configContent);
        const systemObjectId = configData.contexts?.[this.context]?.system_object;

        if (systemObjectId) {
          // Try to read the system object from Sui
          const object = await this.suiClient.getObject({
            id: systemObjectId,
            options: {
              showContent: true,
              showType: true,
            },
          });

          if (object && object.data) {
            result.checks.systemObject = true;
          } else {
            result.errors.push('System object not found on Sui');
          }
        } else {
          result.errors.push('System object ID not in config');
        }
      } catch (error) {
        result.errors.push(`System object check failed: ${error.message}`);
      }

      // Check 4: Can execute a simple Walrus command (info)
      try {
        const { stdout } = await execAsync(
          `${this.walrusPath} --config ${this.configPath} --context ${this.context} info`,
          { timeout: 10000 }
        );
        
        if (stdout) {
          result.checks.command = true;
        }
      } catch (error) {
        result.errors.push(`Command check failed: ${error.message}`);
      }

      // Overall health: all checks must pass
      result.healthy = 
        result.checks.binary &&
        result.checks.config &&
        result.checks.systemObject &&
        result.checks.command;

    } catch (error) {
      result.errors.push(`Health check error: ${error.message}`);
    }

    return result;
  }

  /**
   * Check Sui connectivity
   * 
   * Checks:
   * 1. RPC endpoint is reachable
   * 2. Can query latest checkpoint
   * 3. Can query chain identifier
   * 4. Network matches expected network
   */
  async checkSui() {
    const result = {
      healthy: false,
      checks: {
        rpc: false,
        checkpoint: false,
        chainId: false,
        network: false,
      },
      errors: [],
      details: {},
    };

    try {
      // Check 1: RPC endpoint is reachable
      try {
        const chainIdentifier = await this.suiClient.getChainIdentifier();
        if (chainIdentifier) {
          result.checks.rpc = true;
          result.details.chainId = chainIdentifier;
        }
      } catch (error) {
        result.errors.push(`RPC check failed: ${error.message}`);
      }

      // Check 2: Can query latest checkpoint
      try {
        const checkpoint = await this.suiClient.getLatestCheckpointSequenceNumber();
        if (checkpoint !== null && checkpoint !== undefined) {
          result.checks.checkpoint = true;
          result.details.latestCheckpoint = checkpoint.toString();
        }
      } catch (error) {
        result.errors.push(`Checkpoint check failed: ${error.message}`);
      }

      // Check 3: Can query chain identifier
      try {
        const chainId = await this.suiClient.getChainIdentifier();
        if (chainId) {
          result.checks.chainId = true;
          result.details.chainIdentifier = chainId;
        }
      } catch (error) {
        result.errors.push(`Chain ID check failed: ${error.message}`);
      }

      // Check 4: Network matches expected
      try {
        const rpcUrl = config.sui.rpcUrl;
        const expectedNetwork = config.sui.network;
        
        // Verify network by checking RPC URL
        if (rpcUrl.includes(expectedNetwork)) {
          result.checks.network = true;
          result.details.network = expectedNetwork;
          result.details.rpcUrl = rpcUrl;
        } else {
          result.errors.push(`Network mismatch: expected ${expectedNetwork}, got ${rpcUrl}`);
        }
      } catch (error) {
        result.errors.push(`Network check failed: ${error.message}`);
      }

      // Overall health: all checks must pass
      result.healthy = 
        result.checks.rpc &&
        result.checks.checkpoint &&
        result.checks.chainId &&
        result.checks.network;

    } catch (error) {
      result.errors.push(`Sui health check error: ${error.message}`);
    }

    return result;
  }

  /**
   * Check configuration validity
   */
  async checkConfig() {
    const result = {
      healthy: false,
      checks: {
        oracleObjectId: false,
        adminCapId: false,
        packageId: false,
        walrusConfig: false,
        suiConfig: false,
      },
      errors: [],
    };

    try {
      // Check oracle configuration
      if (config.oracle.objectId && 
          config.oracle.objectId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        result.checks.oracleObjectId = true;
      } else {
        result.errors.push('ORACLE_OBJECT_ID not configured');
      }

      if (config.oracle.adminCapId && 
          config.oracle.adminCapId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        result.checks.adminCapId = true;
      } else {
        result.errors.push('ADMIN_CAP_ID not configured');
      }

      if (config.oracle.packageId && 
          config.oracle.packageId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        result.checks.packageId = true;
      } else {
        result.errors.push('PACKAGE_ID not configured');
      }

      // Check Walrus config
      if (config.walrus.configPath && config.walrus.context) {
        result.checks.walrusConfig = true;
      } else {
        result.errors.push('Walrus configuration incomplete');
      }

      // Check Sui config
      if (config.sui.rpcUrl && config.sui.network) {
        result.checks.suiConfig = true;
      } else {
        result.errors.push('Sui configuration incomplete');
      }

      // Overall health: critical configs must be present
      result.healthy = 
        result.checks.walrusConfig &&
        result.checks.suiConfig;
        // Oracle configuration is optional for basic health checks

    } catch (error) {
      result.errors.push(`Config check error: ${error.message}`);
    }

    return result;
  }

  /**
   * Perform all health checks
   */
  async performAllChecks() {
    const [walrus, sui, config] = await Promise.allSettled([
      this.checkWalrus(),
      this.checkSui(),
      this.checkConfig(),
    ]);

    return {
      walrus: walrus.status === 'fulfilled' ? walrus.value : { healthy: false, error: walrus.reason?.message },
      sui: sui.status === 'fulfilled' ? sui.value : { healthy: false, error: sui.reason?.message },
      config: config.status === 'fulfilled' ? config.value : { healthy: false, error: config.reason?.message },
      overall: {
        healthy: 
          (walrus.status === 'fulfilled' && walrus.value.healthy) &&
          (sui.status === 'fulfilled' && sui.value.healthy) &&
          (config.status === 'fulfilled' && config.value.healthy),
      },
    };
  }
}

