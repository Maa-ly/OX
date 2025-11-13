// Constants for the application
// Merged from src/constants.ts with our existing design

// Sui Network Configuration
export const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

// Move Package ID - Deployed on Sui Testnet
export const PACKAGE_ID =
  process.env.NEXT_PUBLIC_PACKAGE_ID ||
  '0x4991f144c5297f3aee424c2dc66771b1b319cf6b6a3a1f36f62c141a5d9aae9e';

// Oracle Object ID
export const ORACLE_OBJECT_ID =
  process.env.NEXT_PUBLIC_ORACLE_OBJECT_ID ||
  '0xae22366356c30d091040f522a1fb472dea2fb12009f3ca0ff062c916b939ae85';

// Marketplace Object ID
export const MARKETPLACE_OBJECT_ID =
  process.env.NEXT_PUBLIC_MARKETPLACE_OBJECT_ID ||
  '0xfb20bbe2e3edb660a76bafd45685824ab8c0e7bb33d067ec94bff1d981f2cddf';

// Token Registry Object ID
export const TOKEN_REGISTRY_ID =
  process.env.NEXT_PUBLIC_TOKEN_REGISTRY_ID ||
  '0x469e70a37d7a828712a0ae9c072e26bd4e167594e91901470cfd734348bf8be9';

// Rewards Registry Object ID
export const REWARDS_REGISTRY_ID =
  process.env.NEXT_PUBLIC_REWARDS_REGISTRY_ID ||
  '0x2dff8803979b53ab8938b8acdda687a4f7a06bf90faa0077ee4a510cd420d282';

// Reward Config Object ID
export const REWARD_CONFIG_ID =
  process.env.NEXT_PUBLIC_REWARD_CONFIG_ID ||
  '0x1691ae0ec9b3fb622913061c001f9372076cea709417845d5f26137f2da26eb8';

// Price Oracle Object ID
export const PRICE_ORACLE_ID =
  process.env.NEXT_PUBLIC_PRICE_ORACLE_ID ||
  '0xae22366356c30d091040f522a1fb472dea2fb12009f3ca0ff062c916b939ae85';

// Admin Capability IDs (for admin-only operations)
// These are typically not exposed to frontend, but needed for admin operations
export const ADMIN_CAP_ID =
  process.env.NEXT_PUBLIC_ADMIN_CAP_ID ||
  '0x45459e99ab00066294c8a5daa8eaf24ff58bdcaa9e73f063dcf9128e5020cde9';

export const ORACLE_ADMIN_CAP_ID =
  process.env.NEXT_PUBLIC_ORACLE_ADMIN_CAP_ID ||
  '0x75f2ebc5d5ed1ed3480a869511fae45c0432442c8f5ec2df08107005cf2393de';

// Backend API URL
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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

