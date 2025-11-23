"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  TradingChart,
  OrderBook,
  TradePanel,
  PositionsPanel,
} from "@/components/trading";
import { MobileBottomNav, MobileSidebar } from "@/components/mobile-nav";
import { getIPTokens, type IPToken } from "@/lib/utils/api";
import { CustomSelect } from "@/components/ui/custom-select";

const NavWalletButton = dynamic(
  () =>
    import("@/components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  { ssr: false }
);

interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

export default function TradePage() {
  const [tokens, setTokens] = useState<IPToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradeMode, setTradeMode] = useState<"spot" | "perpetual">("perpetual");
  const [activeTab, setActiveTab] = useState<
    "positions" | "orders" | "history"
  >("positions");
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load IP tokens on mount
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setLoading(true);
        const ipTokens = await getIPTokens(true);
        setTokens(ipTokens);

        // Transform first token to selected token format
        if (ipTokens.length > 0) {
          const firstToken = ipTokens[0];
          setSelectedToken({
            id: firstToken.id,
            symbol: firstToken.symbol,
            name: firstToken.name,
            price: (firstToken.currentPrice || 0) / 1e9, // Convert from MIST to SUI
            change24h: firstToken.priceChange24h || 0,
            volume24h: 0, // TODO: Fetch from oracle
            marketCap: (firstToken.currentPrice || 0) * (firstToken.circulatingSupply || 0) / 1e18, // Approximate
          });
        }
      } catch (error) {
        console.error("Error loading tokens:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, []);

  // Handle token selection
  const handleTokenSelect = (tokenId: string) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (token) {
      setSelectedToken({
        id: token.id,
        symbol: token.symbol,
        name: token.name,
        price: (token.currentPrice || 0) / 1e9,
        change24h: token.priceChange24h || 0,
        volume24h: 0, // TODO: Fetch from oracle
        marketCap: (token.currentPrice || 0) * (token.circulatingSupply || 0) / 1e18,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-20 md:pb-0">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
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

            <div className="flex items-center gap-4 lg:gap-6">
              <Link
                href="/markets"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Markets
              </Link>
              <Link
                href="/trade"
                className="hidden md:block text-sm font-medium text-cyan-400 transition-colors hover:text-white"
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

      {/* Main Trading Interface */}
      <div className="pt-16 h-screen flex flex-col">
        {/* Token Info Bar */}
        <div className="border-b border-zinc-800 bg-[#0f0f14] px-4 lg:px-6 py-3">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto w-full lg:w-auto">
              <div className="shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Token Selector */}
                  {tokens.length > 0 && (
                    <CustomSelect
                      value={selectedToken?.id || ""}
                      onChange={handleTokenSelect}
                      options={tokens.map((token) => ({
                        value: token.id,
                        label: `${token.symbol} - ${token.name}`,
                      }))}
                      className="w-48 mr-2"
                    />
                  )}
                  {selectedToken && (
                    <>
                      <span className="text-lg lg:text-xl font-bold">
                        {selectedToken.symbol}/SUI
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          tradeMode === "spot"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {tradeMode === "spot" ? "Spot" : "Perpetual"}
                      </span>
                    </>
                  )}
                </div>
                {selectedToken && (
                  <div className="text-xs text-zinc-500">
                    {selectedToken.name}
                  </div>
                )}
              </div>

              {selectedToken && (
                <div className="flex items-center gap-4 lg:gap-6 text-xs lg:text-sm">
                  <div>
                    <div className="text-zinc-400">Price</div>
                    <div className="font-semibold">
                      {selectedToken.price.toFixed(6)} SUI
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">24h Change</div>
                    <div
                      className={
                        selectedToken.change24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {selectedToken.change24h >= 0 ? "+" : ""}
                      {selectedToken.change24h.toFixed(2)}%
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-zinc-400">24h Volume</div>
                    <div className="font-semibold">
                      {selectedToken.volume24h > 0
                        ? `${(selectedToken.volume24h / 1000000).toFixed(2)}M SUI`
                        : "N/A"}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-zinc-400">Market Cap</div>
                    <div className="font-semibold">
                      {selectedToken.marketCap > 0
                        ? `${(selectedToken.marketCap / 1000000).toFixed(2)}M SUI`
                        : "N/A"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setTradeMode("spot")}
                className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                  tradeMode === "spot"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Spot
              </button>
              <button
                onClick={() => setTradeMode("perpetual")}
                className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                  tradeMode === "perpetual"
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Perpetual
              </button>
            </div>
          </div>
        </div>

        {/* Trading Layout */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div
            className={`${
              isChartFullscreen ? "h-screen" : "min-h-[400px] lg:min-h-[700px]"
            } flex flex-col lg:grid lg:grid-cols-12 gap-0`}
          >
            {/* Left Panel - Order Book (hidden on mobile or in fullscreen) */}
            {!isChartFullscreen && (
              <div className="hidden lg:block lg:col-span-2 border-r border-zinc-800 overflow-y-auto">
                {selectedToken ? (
                  <OrderBook tokenId={selectedToken.id} currentPrice={selectedToken.price} />
                ) : (
                  <div className="p-4 text-zinc-500 text-center">Select a token to view order book</div>
                )}
              </div>
            )}

            {/* Center - Chart */}
            <div
              className={`flex-1 ${
                isChartFullscreen ? "col-span-12" : "lg:col-span-7"
              } flex flex-col min-h-0`}
            >
              {selectedToken ? (
                <TradingChart
                  symbol={selectedToken.symbol}
                  isFullscreen={isChartFullscreen}
                  onToggleFullscreen={() =>
                    setIsChartFullscreen(!isChartFullscreen)
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500">
                  {loading ? "Loading tokens..." : "Select a token to view chart"}
                </div>
              )}
            </div>

            {/* Right Panel - Trade Form (below chart on mobile, side panel on desktop) */}
            {!isChartFullscreen && (
              <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-zinc-800 overflow-y-auto">
                {selectedToken ? (
                  <TradePanel mode={tradeMode} token={selectedToken} />
                ) : (
                  <div className="p-4 text-zinc-500 text-center">Select a token to trade</div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Panel - Positions & Orders (scrollable below viewport, hidden in fullscreen) */}
          {!isChartFullscreen && (
            <div className="border-t border-zinc-800 bg-[#0f0f14] min-h-[400px] lg:min-h-[500px]">
              <PositionsPanel
                mode={tradeMode}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
          )}
        </div>
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
