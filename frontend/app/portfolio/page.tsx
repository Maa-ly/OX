"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { MobileBottomNav, MobileSidebar } from "@/components/mobile-nav";

const NavWalletButton = dynamic(
  () =>
    import("@/components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  { ssr: false }
);

interface Asset {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  change24h: number;
}

interface Position {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  leverage: number;
}

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<
    "assets" | "positions" | "history"
  >("assets");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Mock data
  const totalValue = 25847.32;
  const dailyPnL = 1234.56;
  const dailyPnLPercent = 5.02;

  const assets: Asset[] = [
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: 10000,
      value: 10000,
      change24h: 0,
    },
    {
      symbol: "NARUTO",
      name: "Naruto",
      balance: 250,
      value: 9426.5,
      change24h: -0.66,
    },
    {
      symbol: "ONEPIECE",
      name: "One Piece",
      balance: 100,
      value: 5234,
      change24h: 3.21,
    },
    {
      symbol: "AOT",
      name: "Attack on Titan",
      balance: 28,
      value: 1153.04,
      change24h: 5.67,
    },
  ];

  const positions: Position[] = [
    {
      symbol: "NARUTO/USDC",
      side: "long",
      size: 100,
      entryPrice: 37.5,
      currentPrice: 37.706,
      pnl: 20.6,
      pnlPercent: 5.49,
      leverage: 10,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-20 md:pb-0">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
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
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
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
                className="hidden md:block text-sm font-medium text-cyan-400 transition-colors hover:text-white"
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
          <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
          <p className="text-zinc-400">Track your assets and positions</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-linear-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-lg p-6">
            <div className="text-zinc-400 text-sm mb-2">
              Total Portfolio Value
            </div>
            <div className="text-3xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <div className="text-zinc-400 text-sm mb-2">24h PnL</div>
            <div className="flex items-baseline gap-2">
              <div
                className={`text-3xl font-bold ${
                  dailyPnL >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ${dailyPnL.toFixed(2)}
              </div>
              <div
                className={`text-lg ${
                  dailyPnL >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ({dailyPnL >= 0 ? "+" : ""}
                {dailyPnLPercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <div className="text-zinc-400 text-sm mb-2">Total Assets</div>
            <div className="text-3xl font-bold">{assets.length}</div>
            <div className="text-sm text-zinc-500 mt-1">
              {positions.length} Active Positions
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800 mb-6 flex gap-6">
          <button
            onClick={() => setActiveTab("assets")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "assets"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab("positions")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "positions"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Transaction History
          </button>
        </div>

        {/* Assets Table */}
        {activeTab === "assets" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr className="text-left text-sm text-zinc-400">
                  <th className="py-4 px-6 sticky left-0 bg-zinc-900 z-10">
                    Asset
                  </th>
                  <th className="py-4 px-6 text-right">Balance</th>
                  <th className="py-4 px-6 text-right">Value (USDC)</th>
                  <th className="py-4 px-6 text-right">24h Change</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.symbol}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-4 px-6 sticky left-0 bg-zinc-900/50 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                          {asset.symbol[0]}
                        </div>
                        <div>
                          <div className="font-semibold">{asset.name}</div>
                          <div className="text-xs text-zinc-500">
                            {asset.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold">
                      {asset.balance.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold">
                      ${asset.value.toLocaleString()}
                    </td>
                    <td
                      className={`py-4 px-6 text-right font-semibold ${
                        asset.change24h >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {asset.change24h === 0
                        ? "-"
                        : `${
                            asset.change24h >= 0 ? "+" : ""
                          }${asset.change24h.toFixed(2)}%`}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link
                        href={`/trade?symbol=${asset.symbol}`}
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

        {/* Positions Table */}
        {activeTab === "positions" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-x-auto">
            {positions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <div className="text-zinc-400">No active positions</div>
              </div>
            ) : (
              <table className="w-full min-w-[900px]">
                <thead className="bg-zinc-900 border-b border-zinc-800">
                  <tr className="text-left text-sm text-zinc-400">
                    <th className="py-4 px-6 sticky left-0 bg-zinc-900 z-10">
                      Symbol
                    </th>
                    <th className="py-4 px-6">Side</th>
                    <th className="py-4 px-6 text-right">Size</th>
                    <th className="py-4 px-6 text-right">Entry Price</th>
                    <th className="py-4 px-6 text-right">Current Price</th>
                    <th className="py-4 px-6 text-center">Leverage</th>
                    <th className="py-4 px-6 text-right">PnL</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => (
                    <tr
                      key={index}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-4 px-6 font-semibold sticky left-0 bg-zinc-900/50 backdrop-blur-sm">
                        {position.symbol}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            position.side === "long"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {position.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">{position.size}</td>
                      <td className="py-4 px-6 text-right">
                        ${position.entryPrice.toFixed(3)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        ${position.currentPrice.toFixed(3)}
                      </td>
                      <td className="py-4 px-6 text-center text-cyan-400">
                        {position.leverage}x
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div
                          className={
                            position.pnl >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          ${position.pnl.toFixed(2)}
                        </div>
                        <div
                          className={`text-xs ${
                            position.pnl >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          ({position.pnl >= 0 ? "+" : ""}
                          {position.pnlPercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors">
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">📜</div>
            <div className="text-zinc-400">No transaction history</div>
          </div>
        )}
      </div>

      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <MobileBottomNav />
    </div>
  );
}
