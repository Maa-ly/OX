'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { getIPTokens, type IPToken } from '@/lib/utils/api';
import { getAllCurrentPrices, getPriceFeedSSE, formatPrice, type PriceData } from '@/lib/utils/price-feed';
import { Header } from '@/components/shared/header';

// Force dynamic rendering to avoid useSearchParams() prerendering issues
export const dynamic = 'force-dynamic';

function MarketplaceContent() {
  const [tokens, setTokens] = useState<IPToken[]>([]);
  const [priceData, setPriceData] = useState<Map<string, PriceData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'anime' | 'manga' | 'manhwa'>('all');

  useEffect(() => {
    loadTokens();
  }, []);

  // Subscribe to real-time price updates
  useEffect(() => {
    const sse = getPriceFeedSSE();
    const unsubscribe = sse.subscribe((prices) => {
      setPriceData(prevPriceMap => {
        const newPriceMap = new Map(prevPriceMap);
        prices.forEach(price => {
          newPriceMap.set(price.ipTokenId, price);
        });
        return newPriceMap;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      // Load tokens from API
      const data = await getIPTokens(true);
      setTokens(data);
      
      // Load initial prices
      const prices = await getAllCurrentPrices();
      const priceMap = new Map<string, PriceData>();
      prices.forEach(price => {
        priceMap.set(price.ipTokenId, price);
      });
      setPriceData(priceMap);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || token.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Suspense fallback={
        <nav className="border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse"></div>
            </div>
          </div>
        </nav>
      }>
        <Header />
      </Suspense>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">IP Token Marketplace</h1>
          <p className="text-zinc-400">Browse and trade tokens representing anime, manga, and manhwa engagement</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search IP tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'anime', 'manga', 'manhwa'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterCategory === category
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                    : 'bg-zinc-900/50 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Token Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
              <p className="mt-4 text-zinc-400">Loading tokens...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTokens.map((token) => (
              <Link
                key={token.id}
                href={`/marketplace/${token.id}`}
                className="group rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6 transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {token.name}
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">{token.symbol} • {token.category}</div>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const price = priceData.get(token.id);
                      const currentPrice = price ? formatPrice(price.price) : (token.currentPrice || 0);
                      const previousPrice = price?.ohlc?.open ? formatPrice(price.ohlc.open) : currentPrice;
                      const priceChange = previousPrice > 0 
                        ? ((currentPrice - previousPrice) / previousPrice) * 100 
                        : (token.priceChange24h || 0);
                      
                      return (
                        <>
                          <div className="text-2xl font-bold text-white">
                            {currentPrice.toFixed(6)} SUI
                          </div>
                          <div className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{token.description}</p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Rating</div>
                    <div className="text-sm font-semibold text-white">
                      {token.averageRating ? token.averageRating.toFixed(1) : 'N/A'}/10
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Contributions</div>
                    <div className="text-sm font-semibold text-white">
                      {(token.totalContributions || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Contributors</div>
                    <div className="text-sm font-semibold text-white">
                      {(token.contributors || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Supply</div>
                    <div className="text-sm font-semibold text-white">
                      {token.circulatingSupply && token.totalSupply
                        ? ((token.circulatingSupply / token.totalSupply) * 100).toFixed(1)
                        : 'N/A'}%
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filteredTokens.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-400">No tokens found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Marketplace() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <nav className="border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse"></div>
            </div>
          </div>
        </nav>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
            <p className="mt-4 text-zinc-400">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}

