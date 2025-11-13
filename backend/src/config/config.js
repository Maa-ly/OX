import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// Try loading from backend/.env first, then fall back to root .env
const backendEnvPath = join(__dirname, '../.env');
const rootEnvPath = join(__dirname, '../../.env');

// Try backend/.env first (preferred location)
const envResult = dotenv.config({ path: backendEnvPath });
// If not found, try root .env
if (envResult.error && envResult.error.code === 'ENOENT') {
  dotenv.config({ path: rootEnvPath });
}

export const config = {
  // Sui Configuration
  sui: {
    network: process.env.SUI_NETWORK || 'testnet',
    rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
  },

  // Walrus Configuration
  walrus: {
    configPath: process.env.WALRUS_CONFIG_PATH || '~/.config/walrus/client_config.yaml',
    context: process.env.WALRUS_CONTEXT || 'testnet',
  },

  // Oracle Configuration
  oracle: {
    objectId: process.env.ORACLE_OBJECT_ID,
    adminCapId: process.env.ADMIN_CAP_ID,
    packageId: process.env.PACKAGE_ID,
  },

  // Update Configuration
  update: {
    interval: parseInt(process.env.UPDATE_INTERVAL || '3600000', 10), // Default 1 hour
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'sqlite://./data/oracle.db',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required configuration
export function validateConfig() {
  const required = [
    'oracle.objectId',
    'oracle.adminCapId',
    'oracle.packageId',
  ];

  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value?.[k];
    }
    return !value || value === '0x0000000000000000000000000000000000000000000000000000000000000000';
  });

  if (missing.length > 0) {
    console.warn('Warning: Missing required configuration:', missing.join(', '));
    console.warn('Set these in .env file after smart contract deployment');
  }

  return missing.length === 0;
}

