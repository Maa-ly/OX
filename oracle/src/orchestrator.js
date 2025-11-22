import 'dotenv/config';
import { BACKEND_BASE_URL, ENABLE_REDDIT, ENABLE_INSTAGRAM } from './config.js';
import { fetchRedditPosts } from './providers/reddit.js';
import { fetchInstagramPosts } from './providers/instagram.js';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchTokens() {
  const url = `${BACKEND_BASE_URL}/contract/tokens?detailed=true`;
  const data = await getJson(url);
  return (data.tokens || []).map((t) => ({ id: t.id, name: t.name || 'Unknown' }));
}

async function fetchExistingPosts(ipTokenId) {
  const url = `${BACKEND_BASE_URL}/oracle/contributions/${ipTokenId}?type=post`;
  const data = await getJson(url);
  const list = data.contributions || [];
  const seen = new Set(list.map((c) => `${c.source || ''}:${c.external_id || ''}`));
  return seen;
}

async function storeContribution(contribution) {
  const url = `${BACKEND_BASE_URL}/oracle/contributions`;
  return postJson(url, contribution);
}

async function updateOnChain(ipTokenId, name) {
  const url = `${BACKEND_BASE_URL}/oracle/update/${ipTokenId}?includeExternal=true&name=${encodeURIComponent(name)}`;
  return postJson(url, {});
}

export async function runOnce() {
  const tokens = await fetchTokens();
  for (const token of tokens) {
    const seen = await fetchExistingPosts(token.id);
    let newContributions = [];
    if (ENABLE_REDDIT) {
      const reddit = await fetchRedditPosts(token.id, token.name, 25);
      newContributions.push(...reddit.filter((c) => !seen.has(`${c.source}:${c.external_id}`)));
    }
    if (ENABLE_INSTAGRAM) {
      const insta = await fetchInstagramPosts(token.id, token.name, 10);
      newContributions.push(...insta.filter((c) => !seen.has(`${c.source}:${c.external_id}`)));
    }
    for (const c of newContributions) {
      try {
        await storeContribution(c);
      } catch {}
    }
    try {
      await updateOnChain(token.id, token.name);
    } catch {}
  }
}