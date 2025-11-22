'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { mockAPI, type IPToken } from '@/lib/mocks/data';
import { Header } from '@/components/shared/header';

export default function Marketplace() {
  const [tokens, setTokens] = useState<IPToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'anime' | 'manga' | 'manhwa'>('all');

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await mockAPI.getIPTokens();
      setTokens(data);
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
      <Header />

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
                    <div className="text-2xl font-bold text-white">${token.currentPrice.toFixed(2)}</div>
                    <div className={`text-sm font-medium ${token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{token.description}</p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Rating</div>
                    <div className="text-sm font-semibold text-white">{token.averageRating.toFixed(1)}/10</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Contributions</div>
                    <div className="text-sm font-semibold text-white">{token.totalContributions.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Contributors</div>
                    <div className="text-sm font-semibold text-white">{token.contributors.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Supply</div>
                    <div className="text-sm font-semibold text-white">
                      {((token.circulatingSupply / token.totalSupply) * 100).toFixed(1)}%
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

