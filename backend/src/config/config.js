import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

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

  // Oracle Configuration (NEW DEPLOYMENT)
  oracle: {
    objectId: process.env.ORACLE_OBJECT_ID || '0xae22366356c30d091040f522a1fb472dea2fb12009f3ca0ff062c916b939ae85',
    adminCapId: process.env.ADMIN_CAP_ID || '0x45459e99ab00066294c8a5daa8eaf24ff58bdcaa9e73f063dcf9128e5020cde9',
    oracleAdminCapId: process.env.ORACLE_ADMIN_CAP_ID || '0x75f2ebc5d5ed1ed3480a869511fae45c0432442c8f5ec2df08107005cf2393de',
    packageId: process.env.PACKAGE_ID || '0x4991f144c5297f3aee424c2dc66771b1b319cf6b6a3a1f36f62c141a5d9aae9e',
  },

  // Marketplace Configuration (NEW DEPLOYMENT)
  marketplace: {
    objectId: process.env.MARKETPLACE_OBJECT_ID || '0xfb20bbe2e3edb660a76bafd45685824ab8c0e7bb33d067ec94bff1d981f2cddf',
  },

  // Token Configuration (NEW DEPLOYMENT)
  token: {
    registryId: process.env.TOKEN_REGISTRY_ID || '0x469e70a37d7a828712a0ae9c072e26bd4e167594e91901470cfd734348bf8be9',
    adminCapId: process.env.ADMIN_CAP_ID || '0x45459e99ab00066294c8a5daa8eaf24ff58bdcaa9e73f063dcf9128e5020cde9',
  },

  // Rewards Configuration (NEW DEPLOYMENT)
  rewards: {
    registryId: process.env.REWARDS_REGISTRY_ID || '0x2dff8803979b53ab8938b8acdda687a4f7a06bf90faa0077ee4a510cd420d282',
    configId: process.env.REWARD_CONFIG_ID || '0x1691ae0ec9b3fb622913061c001f9372076cea709417845d5f26137f2da26eb8',
  },

  // Price Oracle Configuration (NEW DEPLOYMENT)
  priceOracle: {
    objectId: process.env.PRICE_ORACLE_ID || '0xae22366356c30d091040f522a1fb472dea2fb12009f3ca0ff062c916b939ae85',
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
