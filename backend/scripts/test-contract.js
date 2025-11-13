#!/usr/bin/env node

/**
 * Test script for backend contract interactions
 * 
 * Usage:
 *   node scripts/test-contract.js <command> [args...]
 * 
 * Commands:
 *   - get-price <ipTokenId>          Get price for an IP token
 *   - get-metrics <ipTokenId>        Get engagement metrics
 *   - get-token-info <tokenId>       Get token information
 *   - get-all-tokens                 Get all tokens from registry
 *   - get-contributor-count <ipTokenId>  Get contributor count
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { contractService } from '../src/services/contract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  try {
    console.log('🔧 Testing Contract Service\n');
    console.log(`Command: ${command}`);
    console.log(`Args: ${args.join(', ')}\n`);

    switch (command) {
      case 'get-price':
        if (!args[0]) {
          console.error('❌ Error: IP token ID required');
          console.log('Usage: node scripts/test-contract.js get-price <ipTokenId>');
          process.exit(1);
        }
        const price = await contractService.getPrice(args[0]);
        console.log('✅ Price:', price ? `${price / 1e9} SUI` : 'Not found');
        break;

      case 'get-metrics':
        if (!args[0]) {
          console.error('❌ Error: IP token ID required');
          console.log('Usage: node scripts/test-contract.js get-metrics <ipTokenId>');
          process.exit(1);
        }
        const metrics = await contractService.getEngagementMetrics(args[0]);
        console.log('✅ Metrics:', JSON.stringify(metrics, null, 2));
        break;

      case 'get-token-info':
        if (!args[0]) {
          console.error('❌ Error: Token ID required');
          console.log('Usage: node scripts/test-contract.js get-token-info <tokenId>');
          process.exit(1);
        }
        const tokenInfo = await contractService.getTokenInfo(args[0]);
        console.log('✅ Token Info:', JSON.stringify(tokenInfo, null, 2));
        break;

      case 'get-all-tokens':
        const tokens = await contractService.getAllTokens();
        console.log('✅ All Tokens:', JSON.stringify(tokens, null, 2));
        break;

      case 'get-contributor-count':
        if (!args[0]) {
          console.error('❌ Error: IP token ID required');
          console.log('Usage: node scripts/test-contract.js get-contributor-count <ipTokenId>');
          process.exit(1);
        }
        const count = await contractService.getContributorCount(args[0]);
        console.log('✅ Contributor Count:', count);
        break;

      case 'get-object':
        if (!args[0]) {
          console.error('❌ Error: Object ID required');
          console.log('Usage: node scripts/test-contract.js get-object <objectId>');
          process.exit(1);
        }
        const object = await contractService.getObject(args[0]);
        console.log('✅ Object:', JSON.stringify(object, null, 2));
        break;

      case 'test-config':
        console.log('📋 Configuration Check:\n');
        console.log('Package ID:', contractService.packageId);
        console.log('Oracle Object ID:', contractService.oracleObjectId);
        console.log('Marketplace Object ID:', contractService.marketplaceObjectId);
        console.log('Token Registry ID:', contractService.tokenRegistryId);
        console.log('Admin Cap ID:', contractService.adminCapId);
        console.log('Rewards Registry ID:', contractService.rewardsRegistryId);
        console.log('Admin Keypair:', contractService.adminKeypair ? '✅ Loaded' : '❌ Not loaded');
        if (contractService.adminKeypair) {
          console.log('Admin Address:', contractService.adminKeypair.toSuiAddress());
        }
        break;

      default:
        console.log('Available commands:');
        console.log('  get-price <ipTokenId>              - Get price for an IP token');
        console.log('  get-metrics <ipTokenId>            - Get engagement metrics');
        console.log('  get-token-info <tokenId>           - Get token information');
        console.log('  get-all-tokens                     - Get all tokens from registry');
        console.log('  get-contributor-count <ipTokenId>  - Get contributor count');
        console.log('  get-object <objectId>              - Get object details');
        console.log('  test-config                        - Test configuration');
        console.log('\nExample:');
        console.log('  node scripts/test-contract.js get-price 0x123...');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

main();

