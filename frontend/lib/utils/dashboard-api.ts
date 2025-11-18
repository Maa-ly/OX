/**
 * Dashboard API utilities
 * Fetches real data from backend for dashboard
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface DashboardPortfolio {
  walletAddress: string;
  totalContributions: number;
  totalRewards: number;
  ipTokensOwned: IPToken[];
  recentContributions: Contribution[];
  totalValue: number;
}

export interface IPToken {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  category?: 'anime' | 'manga' | 'manhwa';
  currentPrice: number;
  priceChange24h: number;
  totalSupply?: number;
  circulatingSupply?: number;
  averageRating: number;
  totalContributions: number;
  imageUrl?: string;
}

export interface Contribution {
  id: string;
  ipTokenId: string;
  ipTokenName: string;
  type: 'rating' | 'prediction' | 'meme' | 'review' | 'stake';
  userWallet: string;
  timestamp: number;
  rating?: number;
  prediction?: string;
  review?: string;
  stake?: number;
  walrusCid: string;
  verified: boolean;
}

/**
 * Get user portfolio from backend
 */
export async function getUserPortfolio(walletAddress: string): Promise<DashboardPortfolio> {
  try {
    // Fetch all tokens first
    const tokensRes = await fetch(`${API_BASE}/api/contract/tokens?detailed=true`);
    const tokensData = await tokensRes.json();
    const allTokens = tokensData.tokens || [];
    
    // Fetch contributions for each token and filter by user
    let userContributions: any[] = [];
    
    for (const token of allTokens) {
      try {
        const contributionsRes = await fetch(`${API_BASE}/api/oracle/contributions/${token.id || token.tokenId}`);
        const contributionsData = await contributionsRes.json();
        const tokenContributions = (contributionsData.contributions || []).filter(
          (c: any) => c.user_wallet?.toLowerCase() === walletAddress.toLowerCase()
        );
        userContributions = [...userContributions, ...tokenContributions];
      } catch (error) {
        console.error(`Failed to fetch contributions for token ${token.id}:`, error);
      }
    }
    
    // Calculate total contributions
    const totalContributions = userContributions.length;
    
    // Get unique IP token IDs from contributions
    const ownedTokenIds = new Set(userContributions.map((c: any) => c.ip_token_id));
    
    // Fetch token details and prices for owned tokens
    const ownedTokens: IPToken[] = [];
    let totalValue = 0;
    
    // Create a map of token ID to token info for quick lookup
    const tokenMap = new Map(allTokens.map((t: any) => [(t.id || t.tokenId), t]));
    
    for (const tokenId of ownedTokenIds) {
      try {
        // Find token in allTokens array
        const tokenInfo = allTokens.find((t: any) => (t.id || t.tokenId) === tokenId);
        
        if (!tokenInfo) continue;
        
        // Get price
        let currentPrice = 0;
        let priceChange24h = 0;
        try {
          const priceRes = await fetch(`${API_BASE}/api/contract/oracle/price/${tokenId}`);
          const priceData = await priceRes.json();
          currentPrice = priceData.price || 0;
          priceChange24h = priceData.priceChange24h || 0;
        } catch (error) {
          console.error(`Failed to fetch price for ${tokenId}:`, error);
        }
        
        // Get metrics
        let averageRating = 0;
        let totalContributions = 0;
        try {
          const metricsRes = await fetch(`${API_BASE}/api/contract/oracle/metrics/${tokenId}`);
          const metricsData = await metricsRes.json();
          averageRating = metricsData.metrics?.average_rating || 0;
          totalContributions = metricsData.metrics?.total_contributions || 0;
        } catch (error) {
          console.error(`Failed to fetch metrics for ${tokenId}:`, error);
        }
        
        const token: IPToken = {
          id: tokenId,
          name: tokenInfo.name || 'Unknown',
          symbol: tokenInfo.symbol || 'UNK',
          description: tokenInfo.description,
          category: tokenInfo.category === 0 ? 'anime' : tokenInfo.category === 1 ? 'manga' : 'manhwa',
          currentPrice,
          priceChange24h,
          totalSupply: tokenInfo.totalSupply,
          circulatingSupply: tokenInfo.circulatingSupply,
          averageRating,
          totalContributions,
        };
        
        ownedTokens.push(token);
        totalValue += token.currentPrice * (token.circulatingSupply || 0);
      } catch (error) {
        console.error(`Failed to fetch token ${tokenId}:`, error);
      }
    }
    
    // Transform contributions to frontend format
    const recentContributions: Contribution[] = userContributions
      .slice(0, 10)
      .map((c: any) => ({
        id: c.id || c.walrus_cid,
        ipTokenId: c.ip_token_id,
        ipTokenName: ownedTokens.find(t => t.id === c.ip_token_id)?.name || 'Unknown',
        type: c.engagement_type as Contribution['type'],
        userWallet: c.user_wallet,
        timestamp: c.timestamp || Date.now(),
        rating: c.rating,
        prediction: c.prediction,
        review: c.review,
        stake: c.stake,
        walrusCid: c.walrus_cid || c.walrus_blob_id || '',
        verified: c.verified || false,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // Calculate total rewards (simplified - you may need to fetch from rewards contract)
    const totalRewards = recentContributions.reduce((sum, c) => {
      // Estimate rewards based on contribution type
      if (c.type === 'rating') return sum + 0.5;
      if (c.type === 'review') return sum + 1.0;
      if (c.type === 'stake') return sum + (c.stake || 0) * 0.1;
      return sum + 0.25;
    }, 0);
    
    return {
      walletAddress,
      totalContributions,
      totalRewards,
      ipTokensOwned: ownedTokens,
      recentContributions,
      totalValue,
    };
  } catch (error) {
    console.error('Failed to fetch user portfolio:', error);
    throw error;
  }
}

/**
 * Get all contributions for a user
 */
export async function getUserContributions(walletAddress: string): Promise<Contribution[]> {
  try {
    // Fetch all tokens
    const tokensRes = await fetch(`${API_BASE}/api/contract/tokens?detailed=true`);
    const tokensData = await tokensRes.json();
    const allTokens = tokensData.tokens || [];
    
    // Fetch contributions for each token and filter by user
    let userContributions: any[] = [];
    
    for (const token of allTokens) {
      try {
        const contributionsRes = await fetch(`${API_BASE}/api/oracle/contributions/${token.id || token.tokenId}`);
        const contributionsData = await contributionsRes.json();
        const tokenContributions = (contributionsData.contributions || []).filter(
          (c: any) => c.user_wallet?.toLowerCase() === walletAddress.toLowerCase()
        );
        userContributions = [...userContributions, ...tokenContributions];
      } catch (error) {
        console.error(`Failed to fetch contributions for token ${token.id}:`, error);
      }
    }
    
    return userContributions.map((c: any) => ({
      id: c.id || c.walrus_cid,
      ipTokenId: c.ip_token_id,
      ipTokenName: 'Unknown', // Will be filled when we have token info
      type: c.engagement_type as Contribution['type'],
      userWallet: c.user_wallet,
      timestamp: c.timestamp || Date.now(),
      rating: c.rating,
      prediction: c.prediction,
      review: c.review,
      stake: c.stake,
      walrusCid: c.walrus_cid || c.walrus_blob_id || '',
      verified: c.verified || false,
    }));
  } catch (error) {
    console.error('Failed to fetch user contributions:', error);
    throw error;
  }
}

