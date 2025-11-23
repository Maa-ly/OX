function mapRedditItem(ipTokenId, ipName, item) {
  const data = item.data || {};
  return {
    ip_token_id: ipTokenId,
    engagement_type: 'post',
    post_type: 'external_post',
    source: 'reddit',
    external_id: data.id || `${data.subreddit}_${data.created_utc}`,
    title: data.title || '',
    url: data.url || `https://reddit.com${data.permalink || ''}`,
    author: data.author || 'unknown',
    ip_name: ipName,
    score: typeof data.score === 'number' ? data.score : 0,
    comments: typeof data.num_comments === 'number' ? data.num_comments : 0,
    ups: typeof data.ups === 'number' ? data.ups : 0,
    downs: typeof data.downs === 'number' ? data.downs : 0,
    timestamp: Math.floor((data.created_utc || Date.now() / 1000) * 1000),
  };
}

export async function fetchRedditPosts(ipTokenId, ipName, limit = 25) {
  const q = encodeURIComponent(ipName);
  const url = `https://www.reddit.com/search.json?q=${q}&sort=new&limit=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'odx-oracle/0.1' } });
  if (!res.ok) return [];
  const json = await res.json();
  const children = json?.data?.children || [];
  return children.map((c) => mapRedditItem(ipTokenId, ipName, c));
}