/**
 * Provider to fetch metrics from the project's oracle-metrics endpoint
 * Endpoint: https://ox-1bq4.vercel.app/api/posts/oracle-metrics
 */

export async function fetchOracleMetrics(oracleMetricsUrl) {
  try {
    const res = await fetch(oracleMetricsUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from oracle-metrics endpoint`);
    }
    const data = await res.json();
    
    if (!data.success) {
      throw new Error('Oracle metrics endpoint returned success=false');
    }
    
    return {
      success: true,
      totalPosts: data.totalPosts || 0,
      posts: data.posts || [],
      metricsByIpToken: data.metricsByIpToken || {},
      summary: data.summary || {},
      timestamp: data.timestamp || Date.now(),
    };
  } catch (error) {
    console.error('Error fetching oracle metrics:', error.message);
    throw error;
  }
}

/**
 * Process oracle metrics data and extract per-IP token information
 */
export function processOracleMetrics(metricsData) {
  const { metricsByIpToken, posts } = metricsData;
  const processed = {};
  
  for (const [ipTokenId, metrics] of Object.entries(metricsByIpToken)) {
    processed[ipTokenId] = {
      ipTokenId,
      totalPosts: metrics.totalPosts || 0,
      totalLikes: metrics.totalLikes || 0,
      totalComments: metrics.totalComments || 0,
      totalEngagement: metrics.totalEngagement || 0,
      imagePosts: metrics.imagePosts || 0,
      videoPosts: metrics.videoPosts || 0,
      textPosts: metrics.textPosts || 0,
      uniqueAuthors: metrics.uniqueAuthors || 0,
      lastActivity: metrics.lastActivity || 0,
      posts: metrics.posts || [],
    };
  }
  
  return processed;
}

