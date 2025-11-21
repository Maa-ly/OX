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
    configPath: '~/.config/walrus/client_config.yaml',
    context: 'testnet',
    // HTTP API URLs
    // Reference: https://docs.wal.app/usage/web-api.html
    // For production: Run your own publisher (see scripts/start-walrus-publisher.sh)
    // Set WALRUS_PUBLISHER_URL environment variable to use your own publisher
    aggregatorUrl: process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
    publisherUrl: process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',
    // Use HTTP API by default
    useHttpApi: true,
    // IMPORTANT: How Walrus Payment Works:
    // - HTTP API: The PUBLISHER's wallet pays, NOT the client's wallet
    // - To have YOUR backend pay for user posts, you need to:
    //   1. Run your own Walrus publisher with your wallet (recommended for production)
    //   2. Fund YOUR publisher's wallet with WAL tokens (using ADMIN_PRIVATE_KEY wallet)
    //   3. Point publisherUrl to your own publisher, not the public testnet one
    //
    // Public testnet publisher uses operator's wallet (may be out of funds)
    // For production: Run your own publisher so YOUR wallet (ADMIN_PRIVATE_KEY) pays
    //
    // To fund YOUR wallet for running a publisher:
    // 1. Ensure ADMIN_PRIVATE_KEY is set (same wallet used for contract operations)
    // 2. Get Testnet SUI from faucet: sui client faucet
    // 3. Exchange SUI for WAL: walrus get-wal (1:1 exchange rate, defaults to 0.5 SUI)
    // 4. Check balance: sui client gas (shows all coins including WAL)
    // Docs: https://docs.wal.app/usage/networks.html
    // Publisher setup: https://docs.wal.app/operator-guide/publisher.html
  },

  // Nautilus Configuration
  nautilus: {
    enclaveUrl: process.env.NAUTILUS_ENCLAVE_URL || 'http://localhost:3000',
    enclavePublicKey: process.env.NAUTILUS_ENCLAVE_PUBLIC_KEY || null,
    timeout: parseInt(process.env.NAUTILUS_TIMEOUT || '30000', 10),
    enabled: process.env.NAUTILUS_ENABLED !== 'false', // Enabled by default
    sources: (process.env.NAUTILUS_SOURCES || 'myanimelist,anilist').split(','),
  },

  // Oracle Configuration (NEW DEPLOYMENT)
  oracle: {
    objectId: process.env.ORACLE_OBJECT_ID || '0x5c1456d721c8217e932591dd9d3b41753ee9f24246f2f651dd9e81bb8ad061c8',
    adminCapId: process.env.ADMIN_CAP_ID || '0x43cdc1aeb7011a7a465e0c32d3fb5478e08d6f5e5bfc68e03152ec037a4e12d4',
    oracleAdminCapId: process.env.ORACLE_ADMIN_CAP_ID || '0x75935be68ba984830004bb2271f93dc759d417d22ee1878dc84c75a42cb7b7b5',
    packageId: process.env.PACKAGE_ID || '0x8d128256cb4958701d56a0c9ada318691e763549766263a7a1c3bd5e9f2c96d0',
  },

  // Marketplace Configuration (NEW DEPLOYMENT)
  marketplace: {
    objectId: process.env.MARKETPLACE_OBJECT_ID || '0x7d54f6e2d129c428bca709c51891c582e69b4740a6218b42dd0633830a827ad1',
  },

  // Token Configuration (NEW DEPLOYMENT)
  token: {
    registryId: process.env.TOKEN_REGISTRY_ID || '0xf5d8e0ebff481965342b4e49f276fa03912355ed5965d9f3bc6c88c630b502e4',
    adminCapId: process.env.ADMIN_CAP_ID || '0x43cdc1aeb7011a7a465e0c32d3fb5478e08d6f5e5bfc68e03152ec037a4e12d4',
  },

  // Rewards Configuration (NEW DEPLOYMENT)
  rewards: {
    registryId: process.env.REWARDS_REGISTRY_ID || '0x764865c8fb630963082eadf8c2ce1b3811505be63071ee5a4e8e3b8030b0e29b',
    configId: process.env.REWARD_CONFIG_ID || '0xd98ffebb35e27dbb94708b177806f03baffb88cced488f70973b41d6cefa469d',
  },

  // Price Oracle Configuration (NEW DEPLOYMENT)
  priceOracle: {
    objectId: process.env.PRICE_ORACLE_ID || '0x5c1456d721c8217e932591dd9d3b41753ee9f24246f2f651dd9e81bb8ad061c8',
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
