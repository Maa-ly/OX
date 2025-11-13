// API utilities for backend communication
// Merged from src/lib/api.ts with improvements

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// Helper function to make API calls
async function apiCall<T>(
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
  getPrice: async (ipTokenId: string) => {
    return apiCall(`/api/contract/oracle/price/${ipTokenId}`);
  },

  // Get engagement metrics
  getEngagementMetrics: async (ipTokenId: string) => {
    return apiCall(`/api/contract/oracle/metrics/${ipTokenId}`);
  },
};

