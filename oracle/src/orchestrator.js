import 'dotenv/config';
import { BACKEND_BASE_URL, ENABLE_REDDIT, ENABLE_INSTAGRAM, ENABLE_ORACLE_METRICS, ORACLE_METRICS_URL } from './config.js';
import { fetchRedditPosts } from './providers/reddit.js';
import { fetchInstagramPosts } from './providers/instagram.js';
import { fetchOracleMetrics, processOracleMetrics } from './providers/oracle-metrics.js';

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

// Backend no longer stores contributions; users store via Walrus SDK.
// Oracle focuses on aggregation + on-chain update.

async function updateOnChain(ipTokenId, name, oracleMetrics = {}) {
  const url = `${BACKEND_BASE_URL}/oracle/update/${ipTokenId}?includeExternal=true&name=${encodeURIComponent(name)}`;
  return postJson(url, { oracleMetrics });
}

export async function runOnce() {
  const tokens = await fetchTokens();
  
  // Fetch oracle metrics from project endpoint (once for all tokens)
  let oracleMetricsData = null;
  if (ENABLE_ORACLE_METRICS) {
    try {
      oracleMetricsData = await fetchOracleMetrics(ORACLE_METRICS_URL);
      const processed = processOracleMetrics(oracleMetricsData);
      console.log(`Oracle metrics: ${Object.keys(processed).length} IP tokens, ${oracleMetricsData.totalPosts} total posts`);
    } catch (error) {
      console.error('Failed to fetch oracle metrics:', error.message);
    }
  }
  
  for (const token of tokens) {
    // Collect external posts and metrics for this token
    const tokenOracleMetrics = {
      reddit: { posts: [] },
      instagram: { posts: [] },
      projectMetrics: null,
    };
    
    // Fetch Reddit posts
    if (ENABLE_REDDIT) {
      try {
        const redditPosts = await fetchRedditPosts(token.id, token.name, 10);
        tokenOracleMetrics.reddit.posts = redditPosts || [];
        console.log(`Collected ${redditPosts?.length || 0} Reddit posts for ${token.name}`);
      } catch (error) {
        console.error(`Failed to fetch Reddit posts for ${token.name}:`, error.message);
      }
    }
    
    // Fetch Instagram posts
    if (ENABLE_INSTAGRAM) {
      try {
        const instagramPosts = await fetchInstagramPosts(token.id, token.name, 5);
        tokenOracleMetrics.instagram.posts = instagramPosts || [];
        console.log(`Collected ${instagramPosts?.length || 0} Instagram posts for ${token.name}`);
      } catch (error) {
        console.error(`Failed to fetch Instagram posts for ${token.name}:`, error.message);
      }
    }
    
    // Get project metrics for this specific token
    if (oracleMetricsData && oracleMetricsData.metricsByIpToken[token.id]) {
      const metrics = oracleMetricsData.metricsByIpToken[token.id];
      tokenOracleMetrics.projectMetrics = {
        totalPosts: metrics.totalPosts || 0,
        totalLikes: metrics.totalLikes || 0,
        totalComments: metrics.totalComments || 0,
        totalEngagement: metrics.totalEngagement || 0,
        uniqueAuthors: metrics.uniqueAuthors || 0,
        lastActivity: metrics.lastActivity || 0,
      };
      console.log(`Token ${token.name} (${token.id}): ${metrics.totalPosts} posts, ${metrics.totalLikes} likes, ${metrics.totalComments} comments`);
    }
    
    // Send all collected metrics to backend for aggregation and on-chain update
    try {
      await updateOnChain(token.id, token.name, tokenOracleMetrics);
      console.log(`Successfully updated metrics for ${token.name}`);
    } catch (error) {
      console.error(`Failed to update metrics for ${token.name}:`, error.message);
    }
  }
}