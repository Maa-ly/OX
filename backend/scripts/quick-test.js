#!/usr/bin/env node

/**
 * Quick test script - tests basic contract service functionality
 * Run this after setting up ADMIN_PRIVATE_KEY
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { contractService } from '../src/services/contract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function quickTest() {
  console.log('🚀 Quick Contract Service Test\n');
  console.log('='.repeat(50));
  
  // Test 1: Configuration
  console.log('\n1️⃣  Testing Configuration...');
  console.log('Package ID:', contractService.packageId);
  console.log('Oracle Object ID:', contractService.oracleObjectId);
  console.log('Marketplace Object ID:', contractService.marketplaceObjectId);
  console.log('Token Registry ID:', contractService.tokenRegistryId);
  console.log('Admin Keypair:', contractService.adminKeypair ? '✅ Loaded' : '❌ Not loaded');
  
  if (!contractService.adminKeypair) {
    console.log('\n⚠️  Admin keypair not loaded!');
    console.log('Set ADMIN_PRIVATE_KEY in backend/.env');
    console.log('See scripts/GET_PRIVATE_KEY.md for instructions');
    process.exit(1);
  }
  
  console.log('Admin Address:', contractService.adminKeypair.toSuiAddress());
  
  // Test 2: Get all tokens (read-only, no gas needed)
  console.log('\n2️⃣  Testing getAllTokens()...');
  try {
    const tokens = await contractService.getAllTokens();
    console.log('✅ Success! Tokens:', tokens);
  } catch (error) {
    console.log('⚠️  Error (this is OK if no tokens exist yet):', error.message);
  }
  
  // Test 3: Get object details (read-only)
  console.log('\n3️⃣  Testing getObject()...');
  try {
    const oracleObject = await contractService.getObject(contractService.oracleObjectId);
    console.log('✅ Success! Oracle object type:', oracleObject.data?.type);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 4: Get price (read-only)
  console.log('\n4️⃣  Testing getPrice()...');
  try {
    // Use a test token ID (this will likely return null if token doesn't exist)
    const testTokenId = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const price = await contractService.getPrice(testTokenId);
    console.log('✅ Success! Price:', price || 'Not found (expected if token not initialized)');
  } catch (error) {
    console.log('⚠️  Error (this is OK if token not initialized):', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Quick test complete!');
  console.log('\nNext steps:');
  console.log('  - Test API endpoints: ./scripts/example-api-call.sh');
  console.log('  - Or use: node scripts/test-contract.js <command>');
  console.log('  - See CONTRACT_SERVICE.md for full documentation');
}

quickTest().catch(console.error);

