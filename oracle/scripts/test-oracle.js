import 'dotenv/config';
import fetchLib from 'node-fetch';

// Attach fetch for Node
if (typeof fetch === 'undefined') globalThis.fetch = fetchLib;

import { BACKEND_BASE_URL } from '../src/config.js';
import { runOnce } from '../src/orchestrator.js';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log('ODX Oracle Test: starting');
  console.log('Backend:', BACKEND_BASE_URL);

  // List tokens
  let tokens = [];
  try {
    const data = await getJson(`${BACKEND_BASE_URL}/contract/tokens?detailed=true`);
    tokens = data.tokens || [];
    console.log(`Tokens found: ${tokens.length}`);
    tokens.slice(0, 3).forEach((t, i) => console.log(`#${i+1}:`, t.id, '-', t.name));
  } catch (e) {
    console.log('Failed to fetch tokens:', e.message);
  }

  // Run one orchestrator cycle
  try {
    await runOnce();
    console.log('Orchestrator run completed');
  } catch (e) {
    console.log('Orchestrator failed:', e.message);
  }

  // For each token, show contribution counts
  for (const t of tokens) {
    try {
      const r = await getJson(`${BACKEND_BASE_URL}/oracle/contributions/${t.id}?type=post`);
      console.log(`IP ${t.name} (${t.id}) posts:`, r.count);
    } catch (e) {
      console.log(`Failed to query contributions for ${t.id}:`, e.message);
    }
  }

  console.log('ODX Oracle Test: done');
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});