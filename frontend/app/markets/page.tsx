"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { CustomSelect } from "@/components/ui/custom-select";

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

  // Mock market data
  const markets: TokenMarket[] = [
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

  const filteredMarkets = markets
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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
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
              <div>
                <div className="text-lg font-bold tracking-tight">ODX</div>
                <div className="text-xs text-zinc-400">Otaku Data Exchange</div>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/markets"
                className="text-sm font-medium text-cyan-400 transition-colors hover:text-white"
              >
                Markets
              </Link>
              <Link
                href="/trade"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Trade
              </Link>
              <Link
                href="/portfolio"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Portfolio
              </Link>
              <Link
                href="/discover"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Discover
              </Link>
              <Link
                href="/predictions"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
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
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr className="text-left text-sm text-zinc-400">
                <th className="py-4 px-6">#</th>
                <th className="py-4 px-6">Name</th>
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
                  <td className="py-4 px-6 text-zinc-500">{index + 1}</td>
                  <td className="py-4 px-6">
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
                    ${market.price.toFixed(3)}
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
                    ${(market.volume24h / 1000000).toFixed(2)}M
                  </td>
                  <td className="py-4 px-6 text-right">
                    ${(market.marketCap / 1000000).toFixed(2)}M
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
      </div>
    </div>
  );
}
