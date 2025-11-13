/**
 * Mock data for ODX frontend
 * Replace these with real API calls when backend is ready
 */

export interface IPToken {
  id: string;
  name: string;
  symbol: string;
  description: string;
  category: 'anime' | 'manga' | 'manhwa';
  currentPrice: number;
  priceChange24h: number;
  totalSupply: number;
  circulatingSupply: number;
  averageRating: number;
  totalContributions: number;
  contributors: number;
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
  contentCid?: string;
  caption?: string;
  review?: string;
  stake?: number;
  walrusCid: string;
  verified: boolean;
}

export interface UserPortfolio {
  walletAddress: string;
  totalContributions: number;
  totalRewards: number;
  ipTokensOwned: IPToken[];
  recentContributions: Contribution[];
  totalValue: number;
}

export const mockIPTokens: IPToken[] = [
  {
    id: '1',
    name: 'Chainsaw Man',
    symbol: 'CSM',
    description: 'A dark fantasy manga series about a young man who becomes a devil hunter',
    category: 'manga',
    currentPrice: 12.45,
    priceChange24h: 5.2,
    totalSupply: 200000,
    circulatingSupply: 125000,
    averageRating: 8.7,
    totalContributions: 3420,
    contributors: 892,
  },
  {
    id: '2',
    name: 'Solo Leveling',
    symbol: 'SL',
    description: 'A Korean web novel and manhwa about a weak hunter who becomes the strongest',
    category: 'manhwa',
    currentPrice: 18.92,
    priceChange24h: -2.1,
    totalSupply: 200000,
    circulatingSupply: 98000,
    averageRating: 9.1,
    totalContributions: 5120,
    contributors: 1245,
  },
  {
    id: '3',
    name: 'One Piece',
    symbol: 'OP',
    description: 'The legendary pirate adventure manga series',
    category: 'manga',
    currentPrice: 45.67,
    priceChange24h: 1.8,
    totalSupply: 200000,
    circulatingSupply: 198000,
    averageRating: 9.5,
    totalContributions: 15230,
    contributors: 3420,
  },
  {
    id: '4',
    name: 'Jujutsu Kaisen',
    symbol: 'JJK',
    description: 'A dark fantasy anime about sorcerers fighting curses',
    category: 'anime',
    currentPrice: 15.23,
    priceChange24h: 8.5,
    totalSupply: 200000,
    circulatingSupply: 87000,
    averageRating: 8.9,
    totalContributions: 6780,
    contributors: 1567,
  },
  {
    id: '5',
    name: 'Demon Slayer',
    symbol: 'DS',
    description: 'A story about a boy who becomes a demon slayer to save his sister',
    category: 'anime',
    currentPrice: 22.34,
    priceChange24h: -1.2,
    totalSupply: 200000,
    circulatingSupply: 112000,
    averageRating: 9.0,
    totalContributions: 8920,
    contributors: 2134,
  },
  {
    id: '6',
    name: 'Attack on Titan',
    symbol: 'AOT',
    description: 'Humanity fights for survival against giant humanoid Titans',
    category: 'anime',
    currentPrice: 28.90,
    priceChange24h: 3.4,
    totalSupply: 200000,
    circulatingSupply: 145000,
    averageRating: 9.3,
    totalContributions: 11240,
    contributors: 2890,
  },
];

export const mockContributions: Contribution[] = [
  {
    id: '1',
    ipTokenId: '1',
    ipTokenName: 'Chainsaw Man',
    type: 'rating',
    userWallet: '0x1234...5678',
    timestamp: Date.now() - 3600000,
    rating: 9,
    walrusCid: 'walrus_cid_1',
    verified: true,
  },
  {
    id: '2',
    ipTokenId: '2',
    ipTokenName: 'Solo Leveling',
    type: 'prediction',
    userWallet: '0x1234...5678',
    timestamp: Date.now() - 7200000,
    prediction: 'Will reach top 3 in popularity next week',
    walrusCid: 'walrus_cid_2',
    verified: true,
  },
  {
    id: '3',
    ipTokenId: '3',
    ipTokenName: 'One Piece',
    type: 'review',
    userWallet: '0x1234...5678',
    timestamp: Date.now() - 10800000,
    review: 'Absolutely amazing series with incredible world-building and character development.',
    walrusCid: 'walrus_cid_3',
    verified: true,
  },
];

export const mockUserPortfolio: UserPortfolio = {
  walletAddress: '0x1234...5678',
  totalContributions: 23,
  totalRewards: 1250.50,
  ipTokensOwned: [
    { ...mockIPTokens[0], currentPrice: 12.45 },
    { ...mockIPTokens[2], currentPrice: 45.67 },
  ],
  recentContributions: mockContributions,
  totalValue: 5820.35,
};

// Mock API functions - replace with real API calls later
export const mockAPI = {
  getIPTokens: async (): Promise<IPToken[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockIPTokens;
  },

  getIPToken: async (id: string): Promise<IPToken | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockIPTokens.find(token => token.id === id) || null;
  },

  getUserPortfolio: async (walletAddress: string): Promise<UserPortfolio> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return { ...mockUserPortfolio, walletAddress };
  },

  getUserContributions: async (walletAddress: string): Promise<Contribution[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockContributions.filter(c => c.userWallet === walletAddress);
  },

  getContributionsByIP: async (ipTokenId: string): Promise<Contribution[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockContributions.filter(c => c.ipTokenId === ipTokenId);
  },

  submitContribution: async (contribution: Omit<Contribution, 'id' | 'timestamp' | 'walrusCid' | 'verified'>): Promise<Contribution> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      ...contribution,
      id: `contrib_${Date.now()}`,
      timestamp: Date.now(),
      walrusCid: `walrus_cid_${Date.now()}`,
      verified: true,
    };
  },
};

