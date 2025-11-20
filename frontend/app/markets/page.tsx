"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { CustomSelect } from "@/components/ui/custom-select";
import { MobileBottomNav, MobileSidebar } from "@/components/mobile-nav";
import { getIPTokens, contractAPI, type PriceResponse } from "@/lib/utils/api";

const NavWalletButton = dynamic(
  () =>
    import("@/components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  { ssr: false }
);

interface TokenMarket {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  image?: string;
}

export default function MarketsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "marketCap" | "volume" | "price" | "change"
  >("marketCap");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [markets, setMarkets] = useState<TokenMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch tokens with detailed info
      const tokens = await getIPTokens(true);
      
      console.log('Fetched tokens:', tokens);
      
      // Filter out tokens with errors and ensure we have valid data
      const validTokens = tokens.filter(token => {
        // Check if token has an error field (from backend)
        if ((token as any).error) {
          console.warn(`Token ${token.id} has error:`, (token as any).error);
          return false;
        }
        // Ensure we have at least an ID
        return token.id && token.id.startsWith('0x');
      });
      
      console.log('Valid tokens:', validTokens.length);
      
      // Fetch prices and metrics for each token
      const marketsData = await Promise.all(
        validTokens.map(async (token) => {
          try {
            // Fetch price from oracle
            let price = 0;
            try {
              const priceData: PriceResponse = await contractAPI.getPrice(token.id);
              console.log(`Price data for ${token.id}:`, priceData);
              if (priceData && priceData.price !== null && priceData.price !== undefined) {
                const rawPrice = Number(priceData.price);
                // Price is returned in MIST (1e9 MIST = 1 SUI), always convert to SUI
                // MIST values are typically very large (e.g., 16905572749700243000)
                if (rawPrice > 0) {
                  // Convert from MIST to SUI by dividing by 1e9
                  price = rawPrice / 1000000000; // 1e9
                  console.log(`Price conversion: ${rawPrice} MIST / 1e9 = ${price} SUI`);
                  
                  // If price seems unreasonably high (> 1M SUI), it might be an error
                  if (price > 1000000) {
                    console.warn(`Price seems very high: ${price} SUI for token ${token.id}`);
                  }
                }
              }
            } catch (priceError) {
              console.warn(`Failed to fetch price for token ${token.id}:`, priceError);
            }

            // Calculate market cap (price * circulating supply)
            const circulatingSupply = token.circulatingSupply || 0;
            const marketCap = price * circulatingSupply;

            // Default values for missing data
            const change24h = token.priceChange24h || 0;
            const volume24h = 0; // TODO: Fetch from marketplace when available

            const market: TokenMarket = {
              id: token.id,
              symbol: (token.symbol && token.symbol !== 'UNK' && !token.symbol.includes('?')) 
                ? token.symbol 
                : `TOKEN-${token.id.slice(2, 6).toUpperCase()}`,
              name: (token.name && token.name !== 'Unknown' && !token.name.includes('?')) 
                ? token.name 
                : `Token ${token.id.slice(2, 10)}`,
              price: price,
              change24h: change24h,
              volume24h: volume24h,
              marketCap: marketCap,
            };
            
            console.log(`Market data for ${token.id}:`, market);
            return market;
          } catch (err) {
            console.error(`Error loading data for token ${token.id}:`, err);
            // Return token with default values if price fetch fails
            return {
              id: token.id,
              symbol: `TOKEN-${token.id.slice(2, 6).toUpperCase()}`,
              name: `Token ${token.id.slice(2, 10)}`,
              price: 0,
              change24h: 0,
              volume24h: 0,
              marketCap: 0,
            } as TokenMarket;
          }
        })
      );

      // Filter out any null/undefined entries
      const filteredMarkets = marketsData.filter(m => m !== null && m !== undefined);
      console.log('Final markets data:', filteredMarkets);
      setMarkets(filteredMarkets);
    } catch (err) {
      console.error('Failed to load markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  // Mock market data (fallback - removed, using real data now)
  const mockMarkets: TokenMarket[] = [
    {
      id: "1",
      symbol: "NARUTO",
      name: "Naruto",
      price: 37.706,
      change24h: -0.66,
      volume24h: 103951486,
      marketCap: 12714962997,
    },
    {
      id: "2",
      symbol: "ONEPIECE",
      name: "One Piece",
      price: 52.34,
      change24h: 3.21,
      volume24h: 156234567,
      marketCap: 18923456789,
    },
    {
      id: "3",
      symbol: "DEMONSLAYER",
      name: "Demon Slayer",
      price: 28.92,
      change24h: -1.45,
      volume24h: 89456123,
      marketCap: 8456789012,
    },
    {
      id: "4",
      symbol: "AOT",
      name: "Attack on Titan",
      price: 41.18,
      change24h: 5.67,
      volume24h: 123456789,
      marketCap: 14567890123,
    },
    {
      id: "5",
      symbol: "MHA",
      name: "My Hero Academia",
      price: 19.87,
      change24h: 2.34,
      volume24h: 67891234,
      marketCap: 6789012345,
    },
    {
      id: "6",
      symbol: "JUJUTSU",
      name: "Jujutsu Kaisen",
      price: 33.45,
      change24h: 4.12,
      volume24h: 98765432,
      marketCap: 11234567890,
    },
    {
      id: "7",
      symbol: "CHAINSAWMAN",
      name: "Chainsaw Man",
      price: 24.76,
      change24h: -2.11,
      volume24h: 54321098,
      marketCap: 7890123456,
    },
    {
      id: "8",
      symbol: "SPY",
      name: "Spy x Family",
      price: 31.22,
      change24h: 1.89,
      volume24h: 76543210,
      marketCap: 9876543210,
    },
  ];

  const filteredMarkets = (markets.length > 0 ? markets : mockMarkets)
    .filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "marketCap":
          return b.marketCap - a.marketCap;
        case "volume":
          return b.volume24h - a.volume24h;
        case "price":
          return b.price - a.price;
        case "change":
          return b.change24h - a.change24h;
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-20 md:pb-0">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu - Mobile Only */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <Link
                href="/"
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-110">
                  <Image
                    src="/favicon.svg"
                    alt="ODX Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                </div>
                <div className="hidden sm:block">
                  <div className="text-lg font-bold tracking-tight">ODX</div>
                  <div className="text-xs text-zinc-400">
                    Otaku Data Exchange
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <Link
                href="/markets"
                className="hidden md:block text-sm font-medium text-cyan-400 transition-colors hover:text-white"
              >
                Markets
              </Link>
              <Link
                href="/trade"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Trade
              </Link>
              <Link
                href="/portfolio"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Portfolio
              </Link>
              <Link
                href="/discover"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Discover
              </Link>
              <Link
                href="/predictions"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Predictions
              </Link>
              <NavWalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Markets</h1>
          <p className="text-zinc-400">Trade anime and manga IP tokens</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-cyan-500"
            />
            <svg
              className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <CustomSelect
            value={sortBy}
            onChange={(value) =>
              setSortBy(value as "marketCap" | "volume" | "price" | "change")
            }
            options={[
              { value: "marketCap", label: "Market Cap" },
              { value: "volume", label: "Volume" },
              { value: "price", label: "Price" },
              { value: "change", label: "24h Change" },
            ]}
            className="w-48"
          />
        </div>

        {/* Market Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
              <p className="mt-4 text-zinc-400">Loading markets...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadMarkets}
              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-12 text-center">
            <p className="text-zinc-400">No tokens found</p>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr className="text-left text-sm text-zinc-400">
                  <th className="py-4 px-6 sticky left-0 bg-zinc-900 z-10">#</th>
                  <th className="py-4 px-6 sticky left-12 bg-zinc-900 z-10">Name</th>
                  <th className="py-4 px-6 text-right">Price</th>
                  <th className="py-4 px-6 text-right">24h Change</th>
                  <th className="py-4 px-6 text-right">24h Volume</th>
                  <th className="py-4 px-6 text-right">Market Cap</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarkets.map((market, index) => (
                <tr
                  key={market.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-4 px-6 text-zinc-500 sticky left-0 bg-zinc-900/50 backdrop-blur-sm">{index + 1}</td>
                  <td className="py-4 px-6 sticky left-12 bg-zinc-900/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold">
                        {market.symbol[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{market.name}</div>
                        <div className="text-xs text-zinc-500">
                          {market.symbol}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-semibold">
                    {market.price > 0 
                      ? market.price > 1000000 
                        ? `$${(market.price / 1000000).toFixed(2)}M`
                        : market.price > 1000
                        ? `$${(market.price / 1000).toFixed(2)}K`
                        : `$${market.price.toFixed(3)}`
                      : '-'}
                  </td>
                  <td
                    className={`py-4 px-6 text-right font-semibold ${
                      market.change24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {market.change24h >= 0 ? "+" : ""}
                    {market.change24h.toFixed(2)}%
                  </td>
                  <td className="py-4 px-6 text-right">
                    {market.volume24h > 0 ? `$${(market.volume24h / 1000000).toFixed(2)}M` : '-'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {market.marketCap > 0 ? `$${(market.marketCap / 1000000).toFixed(2)}M` : '-'}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Link
                      href={`/trade?symbol=${market.symbol}`}
                      className="inline-block px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-colors"
                    >
                      Trade
                    </Link>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
