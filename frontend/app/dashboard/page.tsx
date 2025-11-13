'use client';

import { useWallet } from '@suiet/wallet-kit';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { mockAPI, type UserPortfolio, type IPToken } from '@/lib/mocks/data';

export default function Dashboard() {
  const wallet = useWallet();
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'portfolio'>('overview');

  useEffect(() => {
    if (wallet.connected && wallet.account?.address) {
      loadPortfolio();
    }
  }, [wallet.connected, wallet.account?.address]);

  const loadPortfolio = async () => {
    if (!wallet.account?.address) return;
    setLoading(true);
    try {
      const data = await mockAPI.getUserPortfolio(wallet.account.address);
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="text-zinc-400 mb-6">Please connect your wallet to view your dashboard</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
          <p className="mt-4 text-zinc-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Data Found</h2>
          <p className="text-zinc-400">Unable to load portfolio data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <span className="text-xl font-bold">O</span>
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight">ODX</div>
                <div className="text-xs text-zinc-400">Otaku Data Exchange</div>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/marketplace"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Marketplace
              </Link>
              <Link
                href="/contribute"
                className="rounded-lg border border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:border-cyan-400 hover:bg-cyan-500/20"
              >
                Contribute
              </Link>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm font-medium">
                {wallet.account?.address.slice(0, 6)}...{wallet.account?.address.slice(-4)}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-zinc-400">Welcome back! Here's your activity overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <div className="text-sm font-medium text-zinc-400 mb-2">Total Value</div>
            <div className="text-2xl font-bold">${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <div className="text-sm font-medium text-zinc-400 mb-2">Contributions</div>
            <div className="text-2xl font-bold">{portfolio.totalContributions}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <div className="text-sm font-medium text-zinc-400 mb-2">Rewards Earned</div>
            <div className="text-2xl font-bold">${portfolio.totalRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <div className="text-sm font-medium text-zinc-400 mb-2">IP Tokens Owned</div>
            <div className="text-2xl font-bold">{portfolio.ipTokensOwned.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-zinc-800">
          <nav className="-mb-px flex space-x-8">
            {(['overview', 'contributions', 'portfolio'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Contributions */}
            <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Contributions</h2>
              <div className="space-y-4">
                {portfolio.recentContributions.slice(0, 5).map((contrib) => (
                  <div key={contrib.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{contrib.ipTokenName}</span>
                        <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 capitalize">{contrib.type}</span>
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {contrib.rating && `Rating: ${contrib.rating}/10`}
                        {contrib.prediction && `Prediction: ${contrib.prediction}`}
                        {contrib.review && `Review: ${contrib.review.slice(0, 50)}...`}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {new Date(contrib.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Owned IP Tokens */}
            <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6">
              <h2 className="text-xl font-semibold mb-4">Your IP Tokens</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {portfolio.ipTokensOwned.map((token) => (
                  <div key={token.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-white">{token.name}</div>
                        <div className="text-sm text-zinc-400">{token.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">${token.currentPrice.toFixed(2)}</div>
                        <div className={`text-sm ${token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contributions' && (
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <h2 className="text-xl font-semibold mb-4">All Contributions</h2>
            <div className="space-y-4">
              {portfolio.recentContributions.map((contrib) => (
                <div key={contrib.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-white">{contrib.ipTokenName}</span>
                        <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 capitalize">{contrib.type}</span>
                        {contrib.verified && (
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">Verified</span>
                        )}
                      </div>
                      {contrib.rating && (
                        <div className="text-sm text-zinc-300">Rating: <span className="text-cyan-400">{contrib.rating}/10</span></div>
                      )}
                      {contrib.prediction && (
                        <div className="text-sm text-zinc-300">Prediction: <span className="text-cyan-400">{contrib.prediction}</span></div>
                      )}
                      {contrib.review && (
                        <div className="text-sm text-zinc-300 mt-2">{contrib.review}</div>
                      )}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {new Date(contrib.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <h2 className="text-xl font-semibold mb-4">IP Token Portfolio</h2>
            <div className="space-y-4">
              {portfolio.ipTokensOwned.map((token) => (
                <div key={token.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-2xl font-bold text-white">{token.name}</div>
                      <div className="text-sm text-zinc-400">{token.symbol} • {token.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">${token.currentPrice.toFixed(2)}</div>
                      <div className={`text-sm ${token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}% (24h)
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                    <div>
                      <div className="text-sm text-zinc-400 mb-1">Average Rating</div>
                      <div className="text-lg font-semibold text-white">{token.averageRating.toFixed(1)}/10</div>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-400 mb-1">Total Contributions</div>
                      <div className="text-lg font-semibold text-white">{token.totalContributions.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

