// API utilities for backend communication
// Merged from src/lib/api.ts with improvements

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// Helper function to make API calls
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API call failed: ${response.statusText}`);
  }

  return response.json();
}

// Contribution API
export const contributionAPI = {
  // Store a new contribution
  store: async (contribution: any) => {
    return apiCall('/api/oracle/contributions', {
      method: 'POST',
      body: JSON.stringify(contribution),
    });
  },

  // Get contributions for an IP token
  getByIP: async (
    ipTokenId: string,
    options?: { type?: string; startTime?: number; endTime?: number }
  ) => {
    const params = new URLSearchParams();
    if (options?.type) params.append('type', options.type);
    if (options?.startTime) params.append('startTime', options.startTime.toString());
    if (options?.endTime) params.append('endTime', options.endTime.toString());

    return apiCall(`/api/oracle/contributions/${ipTokenId}?${params.toString()}`);
  },

  // Verify a contribution
  verify: async (contribution: any) => {
    return apiCall('/api/oracle/verify', {
      method: 'POST',
      body: JSON.stringify({ contribution }),
    });
  },
};

// Metrics API
export const metricsAPI = {
  // Get aggregated metrics for an IP token
  getByIP: async (ipTokenId: string) => {
    return apiCall(`/api/metrics/${ipTokenId}`);
  },

  // Trigger on-chain update
  update: async (ipTokenId: string) => {
    return apiCall(`/api/oracle/update/${ipTokenId}`, {
      method: 'POST',
    });
  },
};

// Health API
export const healthAPI = {
  check: async () => {
    return apiCall('/health');
  },
};

// Price API response type
export interface PriceResponse {
  success: boolean;
  ipTokenId: string;
  price: number | null;
}

// Engagement metrics response type
export interface EngagementMetricsResponse {
  success: boolean;
  ipTokenId: string;
  metrics: any;
}

// Contract API (for direct contract interactions)
export const contractAPI = {
  // Get all tokens
  getAllTokens: async () => {
    return apiCall('/api/contract/tokens');
  },

  // Get token info
  getTokenInfo: async (tokenId: string) => {
    return apiCall(`/api/contract/tokens/${tokenId}`);
  },

  // Get price for an IP token
  getPrice: async (ipTokenId: string): Promise<PriceResponse> => {
    return apiCall<PriceResponse>(`/api/contract/oracle/price/${ipTokenId}`);
  },

  // Get engagement metrics
  getEngagementMetrics: async (ipTokenId: string): Promise<EngagementMetricsResponse> => {
    return apiCall<EngagementMetricsResponse>(`/api/contract/oracle/metrics/${ipTokenId}`);
  },
};

/**
 * IP Token interface
 */
export interface IPToken {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  category?: 'anime' | 'manga' | 'manhwa';
  totalSupply?: number;
  reservePool?: number;
  circulatingSupply?: number;
  currentPrice?: number;
  priceChange24h?: number;
  imageUrl?: string;
}

/**
 * Get all IP tokens from the backend
 * 
 * @param detailed - If true, returns full token information. Default: true
 * @returns Promise with tokens array
 */
export async function getIPTokens(detailed: boolean = true): Promise<IPToken[]> {
  const url = `${API_BASE}/api/contract/tokens${detailed ? '?detailed=true' : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch tokens: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Transform backend response to frontend format
  if (detailed && data.tokens && Array.isArray(data.tokens)) {
    return data.tokens.map((token: any) => ({
      id: token.id || token.tokenId,
      name: token.name || 'Unknown',
      symbol: token.symbol || 'UNK',
      description: token.description,
      category: token.category === 0 ? 'anime' : token.category === 1 ? 'manga' : token.category === 2 ? 'manhwa' : undefined,
      totalSupply: token.totalSupply,
      reservePool: token.reservePool,
      circulatingSupply: token.circulatingSupply,
      currentPrice: token.currentPrice,
      priceChange24h: token.priceChange24h,
    }));
  } else if (data.tokens && Array.isArray(data.tokens)) {
    // If just IDs, return minimal format
    return data.tokens.map((tokenId: string) => ({
      id: tokenId,
      name: 'Token',
      symbol: 'TKN',
    }));
  }

  return [];
}

