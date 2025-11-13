#!/usr/bin/env node

/**
 * Script to help extract private key from Sui CLI
 * 
 * Usage:
 *   1. Run: sui keytool export <key-alias> --json
 *   2. Copy the output JSON
 *   3. Run this script with the JSON as input, or paste it when prompted
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('🔑 Sui Private Key Extractor\n');
console.log('Steps:');
console.log('1. Run: sui keytool export <your-key-alias> --json');
console.log('2. Copy the entire JSON output');
console.log('3. Paste it here and press Enter\n');

rl.question('Paste the JSON output from sui keytool export:\n', (input) => {
  try {
    const keyData = JSON.parse(input.trim());
    
    // Extract private key based on Sui keytool format
    let privateKey = null;
    
    if (keyData.privateKey) {
      privateKey = keyData.privateKey;
    } else if (keyData.private_key) {
      privateKey = keyData.private_key;
    } else if (keyData.key) {
      privateKey = keyData.key;
    } else if (Array.isArray(keyData) && keyData.length > 0) {
      // Sometimes it's an array with the key as first element
      privateKey = keyData[0];
    }
    
    if (!privateKey) {
      console.error('❌ Could not find private key in the JSON. Keys found:', Object.keys(keyData));
      console.log('\nFull JSON:', JSON.stringify(keyData, null, 2));
      rl.close();
      return;
    }
    
    // The private key from sui keytool is already base64 encoded
    // But we need to make sure it's in the right format
    console.log('\n✅ Private Key Extracted!\n');
    console.log('Add this to your backend/.env file:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`ADMIN_PRIVATE_KEY=${privateKey}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log('\n⚠️  Keep this private key secure! Never commit it to git.\n');
    
  } catch (error) {
    console.error('❌ Error parsing JSON:', error.message);
    console.log('\nMake sure you copied the entire JSON output from sui keytool export');
  }
  
  rl.close();
});

