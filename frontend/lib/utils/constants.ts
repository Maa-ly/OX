// Constants for the application
// Merged from src/constants.ts with our existing design

// Sui Network Configuration
export const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

// Move Package ID - Deployed on Sui Testnet
export const PACKAGE_ID =
  process.env.NEXT_PUBLIC_PACKAGE_ID ||
  '0x8d128256cb4958701d56a0c9ada318691e763549766263a7a1c3bd5e9f2c96d0';

// Oracle Object ID
export const ORACLE_OBJECT_ID =
  process.env.NEXT_PUBLIC_ORACLE_OBJECT_ID ||
  '0x5c1456d721c8217e932591dd9d3b41753ee9f24246f2f651dd9e81bb8ad061c8';

// Marketplace Object ID
export const MARKETPLACE_OBJECT_ID =
  process.env.NEXT_PUBLIC_MARKETPLACE_OBJECT_ID ||
  '0x7d54f6e2d129c428bca709c51891c582e69b4740a6218b42dd0633830a827ad1';

// Token Registry Object ID
export const TOKEN_REGISTRY_ID =
  process.env.NEXT_PUBLIC_TOKEN_REGISTRY_ID ||
  '0xf5d8e0ebff481965342b4e49f276fa03912355ed5965d9f3bc6c88c630b502e4';

// Rewards Registry Object ID
export const REWARDS_REGISTRY_ID =
  process.env.NEXT_PUBLIC_REWARDS_REGISTRY_ID ||
  '0x764865c8fb630963082eadf8c2ce1b3811505be63071ee5a4e8e3b8030b0e29b';

// Reward Config Object ID
export const REWARD_CONFIG_ID =
  process.env.NEXT_PUBLIC_REWARD_CONFIG_ID ||
  '0xd98ffebb35e27dbb94708b177806f03baffb88cced488f70973b41d6cefa469d';

// Price Oracle Object ID
export const PRICE_ORACLE_ID =
  process.env.NEXT_PUBLIC_PRICE_ORACLE_ID ||
  '0x5c1456d721c8217e932591dd9d3b41753ee9f24246f2f651dd9e81bb8ad061c8';

// Admin Capability IDs (for admin-only operations)
// These are typically not exposed to frontend, but needed for admin operations
export const ADMIN_CAP_ID =
  process.env.NEXT_PUBLIC_ADMIN_CAP_ID ||
  '0x43cdc1aeb7011a7a465e0c32d3fb5478e08d6f5e5bfc68e03152ec037a4e12d4';

export const ORACLE_ADMIN_CAP_ID =
  process.env.NEXT_PUBLIC_ORACLE_ADMIN_CAP_ID ||
  '0x75935be68ba984830004bb2271f93dc759d417d22ee1878dc84c75a42cb7b7b5';

// Backend API URL
// Backend typically runs on port 3001 to avoid conflict with Next.js frontend (port 3000)
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Sui RPC URL
export const SUI_RPC_URL =
  SUI_NETWORK === 'testnet'
    ? 'https://fullnode.testnet.sui.io:443'
    : 'https://fullnode.mainnet.sui.io:443';

// Contribution Types
export const CONTRIBUTION_TYPES = {
  RATING: 'rating',
  MEME: 'meme',
  POST: 'post',
  EPISODE_PREDICTION: 'episode_prediction',
  PRICE_PREDICTION: 'price_prediction',
  STAKE: 'stake',
  REVIEW: 'review',
  VOTE: 'vote',
} as const;

export type ContributionType =
  typeof CONTRIBUTION_TYPES[keyof typeof CONTRIBUTION_TYPES];

