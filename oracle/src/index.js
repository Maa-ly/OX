import 'dotenv/config';
import fetchLib from 'node-fetch';
import { UPDATE_INTERVAL_MS } from './config.js';
import { runOnce } from './orchestrator.js';

async function main() {
  if (typeof fetch === 'undefined') globalThis.fetch = fetchLib;
  await runOnce();
  if (UPDATE_INTERVAL_MS > 0) {
    setInterval(() => {
      runOnce().catch(() => {});
    }, UPDATE_INTERVAL_MS);
  }
}

main().catch(() => {});