'use client';

import { useWalletAuth } from '@/lib/hooks/useWalletAuth';
import { useZkLogin } from '@/lib/hooks/useZkLogin';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/shared/header';
import { getUserPortfolio, type DashboardPortfolio, type IPToken } from '@/lib/utils/dashboard-api';

function DashboardContent() {
  const { address: walletAddress } = useWalletAuth();
  const { address: zkLoginAddress } = useZkLogin();
  const { isAuthenticated, address } = useAuthStore();
  const [portfolio, setPortfolio] = useState<DashboardPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'portfolio'>('overview');

  // Get current address (prioritizes wallet over zkLogin)
  const currentAddress = address || walletAddress || zkLoginAddress;

  useEffect(() => {
    if (currentAddress) {
      loadPortfolio();
    }
  }, [currentAddress]);

  const loadPortfolio = async () => {
    if (!currentAddress) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserPortfolio(currentAddress);
      setPortfolio(data);
    } catch (error: any) {
      console.error('Failed to load portfolio:', error);
      setError(error.message || 'Failed to load portfolio data');
      // Fallback to empty portfolio
      setPortfolio({
        walletAddress: currentAddress,
        totalContributions: 0,
        totalRewards: 0,
        ipTokensOwned: [],
        recentContributions: [],
        totalValue: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated && !currentAddress) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Not Authenticated</h2>
          <p className="text-zinc-400 mb-6">Please connect your wallet or sign in to view your dashboard</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
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

  if (!portfolio && !loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
        <Header 
          showWallet={true}
          showContribute={true}
          showMarketplace={true}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">No Data Found</h2>
            <p className="text-zinc-400 mb-4">{error || 'Unable to load portfolio data'}</p>
            <button
              onClick={loadPortfolio}
              className="rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return null; // Loading state already handled above
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Header 
        showWallet={true}
        showContribute={true}
        showMarketplace={true}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-zinc-400">Welcome back! Here's your activity overview</p>
          {error && (
            <div className="mt-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p className="text-yellow-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <div className="text-sm font-medium text-zinc-400 mb-2">Total Value</div>
            <div className="text-2xl font-bold">${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <div className="text-sm font-medium text-zinc-400 mb-2">Contributions</div>
            <div className="text-2xl font-bold">{portfolio.totalContributions}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6">
            <div className="text-sm font-medium text-zinc-400 mb-2">Rewards Earned</div>
            <div className="text-2xl font-bold">${portfolio.totalRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6">
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
            <div className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6">
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
            <div className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6">
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
          <div className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6">
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
          <div className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6">
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

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
            <p className="mt-4 text-zinc-400">Loading your dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
