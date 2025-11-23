function mapInstagramItem(ipTokenId, ipName, item) {
  return {
    ip_token_id: ipTokenId,
    engagement_type: 'post',
    post_type: 'external_post',
    source: 'instagram',
    external_id: item.id,
    title: item.caption || '',
    url: item.permalink || '',
    author: item.username || 'unknown',
    ip_name: ipName,
    likes: item.like_count || 0,
    comments: item.comments_count || 0,
    timestamp: item.timestamp ? Date.parse(item.timestamp) : Date.now(),
    media_type: item.media_type,
    media_url: item.media_url,
  };
}

export async function fetchInstagramPosts(ipTokenId, ipName, limit = 25) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];
  const hashtag = ipName.replace(/\s+/g, '').toLowerCase();
  const searchUrl = `https://graph.facebook.com/v19.0/ig_hashtag_search?user_id=${process.env.INSTAGRAM_USER_ID}&q=${encodeURIComponent(hashtag)}&access_token=${token}`;
  const resId = await fetch(searchUrl);
  if (!resId.ok) return [];
  const jsonId = await resId.json();
  const tagId = jsonId?.data?.[0]?.id;
  if (!tagId) return [];
  const recentUrl = `https://graph.facebook.com/v19.0/${tagId}/recent_media?user_id=${process.env.INSTAGRAM_USER_ID}&fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,username&limit=${limit}&access_token=${token}`;
  const resMedia = await fetch(recentUrl);
  if (!resMedia.ok) return [];
  const mediaJson = await resMedia.json();
  const items = mediaJson?.data || [];
  return items.map((i) => mapInstagramItem(ipTokenId, ipName, i));
}