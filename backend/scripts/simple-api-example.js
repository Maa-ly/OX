#!/usr/bin/env node

/**
 * Simple example: Make a backend API call
 * 
 * This shows how to call the backend contract API from Node.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/contract';

async function exampleApiCall() {
  console.log('📡 Example Backend API Call\n');
  
  // Example 1: Get all tokens (read-only, no auth needed)
  console.log('1️⃣  Getting all tokens...');
  try {
    const response = await fetch(`${BASE_URL}/tokens`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Make sure the backend server is running: npm start');
  }
  
  console.log('\n');
  
  // Example 2: Get price for a token
  console.log('2️⃣  Getting price for IP token...');
  const testTokenId = '0x4565bda97f21e43a7fa4f3a9e07ac400ab448fc1f5044a5422fd698b8ceb6936';
  try {
    const response = await fetch(`${BASE_URL}/oracle/price/${testTokenId}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n');
  
  // Example 3: Get object details
  console.log('3️⃣  Getting object details...');
  const objectId = '0x4565bda97f21e43a7fa4f3a9e07ac400ab448fc1f5044a5422fd698b8ceb6936';
  try {
    const response = await fetch(`${BASE_URL}/objects/${objectId}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n');
  console.log('✅ Examples complete!');
  console.log('\nTo test write operations (like updating metrics),');
  console.log('make sure ADMIN_PRIVATE_KEY is set in backend/.env');
}

exampleApiCall();

