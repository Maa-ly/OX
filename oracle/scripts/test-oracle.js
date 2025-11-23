import 'dotenv/config';
import fetchLib from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Attach fetch for Node
if (typeof fetch === 'undefined') globalThis.fetch = fetchLib;

let BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000/api';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function baseFromApi(apiUrl) {
  if (!apiUrl) return 'http://localhost:3000';
  const idx = apiUrl.indexOf('/api');
  return idx > -1 ? apiUrl.slice(0, idx) : apiUrl;
}

async function waitForHealth(baseUrl, timeoutMs = 20000) {
  const start = Date.now();
  const healthUrl = `${baseUrl}/health`;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function findHealthyBaseUrl() {
  const envBase = baseFromApi(BACKEND_BASE_URL);
  const candidates = new Set([envBase]);
  for (let p = 3000; p <= 3010; p++) candidates.add(`http://localhost:${p}`);
  for (const base of candidates) {
    try {
      const ok = await waitForHealth(base, 2000);
      if (ok) return base;
    } catch {}
  }
  return envBase;
}

function updateEnvBackend(baseUrl) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const backendEnvPath = path.resolve(process.cwd(), '../backend/.env');
    const apiUrl = `${baseUrl}/api`;
    process.env.BACKEND_BASE_URL = apiUrl;
    BACKEND_BASE_URL = apiUrl;
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf-8');
      if (content.includes('BACKEND_BASE_URL=')) {
        content = content.replace(/BACKEND_BASE_URL=.*/g, `BACKEND_BASE_URL=${apiUrl}`);
      } else {
        content += `\nBACKEND_BASE_URL=${apiUrl}\n`;
      }
      fs.writeFileSync(envPath, content);
      console.log('Updated oracle .env BACKEND_BASE_URL ->', apiUrl);
    }
    if (fs.existsSync(backendEnvPath)) {
      let bcontent = fs.readFileSync(backendEnvPath, 'utf-8');
      const setOrAdd = (key, value) => {
        if (bcontent.includes(`${key}=`)) {
          bcontent = bcontent.replace(new RegExp(`${key}=.*`, 'g'), `${key}=${value}`);
        } else {
          bcontent += `\n${key}=${value}\n`;
        }
      };
      setOrAdd('DISABLE_SCHEDULER', 'true');
      fs.writeFileSync(backendEnvPath, bcontent);
      console.log('Updated backend .env: DISABLE_SCHEDULER=true');
    }
  } catch (e) {
    console.log('Failed to update .env:', e.message);
  }
}

async function ensureBackend() {
  try {
    await getJson(`${BACKEND_BASE_URL}/contract/tokens?detailed=true`);
    return true;
  } catch {}
  const backendDir = path.resolve(process.cwd(), '../backend');
  console.log('Starting backend server...');
  const child = spawn('npm', ['start'], { cwd: backendDir, stdio: 'inherit', shell: true, detached: true });
  const baseUrl = await findHealthyBaseUrl();
  const ready = await waitForHealth(baseUrl, 25000);
  if (!ready) {
    console.log('Backend did not become ready in time');
    return false;
  }
  console.log('Backend is ready');
  updateEnvBackend(baseUrl);
  return true;
}

async function main() {
  console.log('ODX Oracle Test: starting');
  console.log('Backend:', BACKEND_BASE_URL);

  await ensureBackend();

  // Re-import orchestrator with updated env
  const { runOnce } = await import('../src/orchestrator.js');

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