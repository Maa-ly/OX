"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { CustomSelect } from "@/components/ui/custom-select";
import { MobileBottomNav, MobileSidebar } from "@/components/mobile-nav";
import { getIPTokens, contractAPI, type PriceResponse } from "@/lib/utils/api";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { createBuyOrder, createSellOrder } from "@/lib/utils/contract";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { PACKAGE_ID } from "@/lib/utils/constants";
import { getAllCurrentPrices, getPriceFeedSSE, formatPrice, type PriceData } from "@/lib/utils/price-feed";

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
  const { wallet, isConnected, address } = useWalletAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "marketCap" | "volume" | "price" | "change"
  >("marketCap");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [markets, setMarkets] = useState<TokenMarket[]>([]);
  const [priceData, setPriceData] = useState<Map<string, PriceData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Buy/Sell modal state
  const [selectedToken, setSelectedToken] = useState<TokenMarket | null>(null);
  const [modalType, setModalType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [suiBalance, setSuiBalance] = useState<bigint>(BigInt(0));
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0));

  useEffect(() => {
    loadMarkets();
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
        
        // Update markets with new prices
        setMarkets(prevMarkets => {
          return prevMarkets.map(market => {
            const price = newPriceMap.get(market.id);
            if (price) {
              const currentPrice = formatPrice(price.price);
              const previousPrice = price.ohlc?.open ? formatPrice(price.ohlc.open) : currentPrice;
              const priceChange = previousPrice > 0 
                ? ((currentPrice - previousPrice) / previousPrice) * 100 
                : market.change24h;
              
              return {
                ...market,
                price: currentPrice,
                change24h: priceChange,
                marketCap: currentPrice * (market.marketCap / (market.price || 1)), // Maintain market cap ratio
              };
            }
            return market;
          });
        });
        
        return newPriceMap;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load balances when token is selected
  useEffect(() => {
    if (selectedToken && isConnected && address) {
      loadBalances();
    }
  }, [selectedToken, isConnected, address]);

  const loadBalances = async () => {
    if (!selectedToken || !address) return;
    
    try {
      const client = new SuiClient({ url: getFullnodeUrl('testnet') });
      
      // Get SUI balance
      const suiBalanceData = await client.getBalance({ owner: address });
      setSuiBalance(BigInt(suiBalanceData.totalBalance));
      
      // Get IP token balance - IP tokens are owned objects, not coins
      // We need to query owned objects with the IP token type
      try {
        const ownedObjects = await client.getOwnedObjects({
          owner: address,
          filter: {
            StructType: `${PACKAGE_ID}::token::IPToken`,
          },
          options: {
            showContent: true,
          },
        });
        
        // Count tokens that match the selected token ID
        // Note: This is a simplified check - in reality, we'd need to check the token ID field
        // For now, we'll just count all IP tokens the user owns
        const matchingTokens = ownedObjects.data.filter((obj: any) => {
          // Check if this object's ID matches the selected token ID
          // Or check if it's the same token type
          return obj.data?.objectId === selectedToken.id || 
                 (obj.data?.type?.includes('IPToken') && obj.data?.content?.fields?.id === selectedToken.id);
        });
        
        // For now, we'll use a placeholder - the actual balance check should be done by querying
        // the token's balance field if it has one, or by checking owned objects more carefully
        // The contract will reject the sell order if the user doesn't have enough tokens anyway
        setTokenBalance(BigInt(matchingTokens.length > 0 ? 1000000 : 0)); // Placeholder - contract will validate
      } catch (e) {
        // Token might not exist or user might not have any
        setTokenBalance(BigInt(0));
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const openBuyModal = (token: TokenMarket) => {
    setSelectedToken(token);
    setModalType("buy");
    setQuantity("");
    // Use current price from price feed if available, otherwise use token price
    const currentPrice = priceData.get(token.id);
    const priceInMist = currentPrice 
      ? currentPrice.price.toString() 
      : (token.price > 0 ? (token.price * 1e9).toString() : "");
    setPrice(priceInMist);
    setModalError(null);
    setModalSuccess(null);
  };

  const openSellModal = (token: TokenMarket) => {
    setSelectedToken(token);
    setModalType("sell");
    setQuantity("");
    // Use current price from price feed if available, otherwise use token price
    const currentPrice = priceData.get(token.id);
    const priceInMist = currentPrice 
      ? currentPrice.price.toString() 
      : (token.price > 0 ? (token.price * 1e9).toString() : "");
    setPrice(priceInMist);
    setModalError(null);
    setModalSuccess(null);
  };

  const closeModal = () => {
    setSelectedToken(null);
    setQuantity("");
    setPrice("");
    setModalError(null);
    setModalSuccess(null);
  };

  const handleBuy = async () => {
    if (!selectedToken || !wallet || !isConnected || !address) {
      setModalError("Please connect your wallet");
      return;
    }

    if (!quantity || !price) {
      setModalError("Please enter quantity and price");
      return;
    }

    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (quantityNum <= 0 || priceNum <= 0) {
      setModalError("Quantity and price must be greater than 0");
      return;
    }

    setSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      // Get SUI coins for payment
      const client = new SuiClient({ url: getFullnodeUrl('testnet') });
      const allCoins = await client.getAllCoins({ owner: address });
      const suiCoins = allCoins.data.filter(c => c.coinType === '0x2::sui::SUI');
      
      if (suiCoins.length === 0) {
        throw new Error("No SUI coins found. Please ensure you have SUI in your wallet.");
      }

      // Calculate total cost (price * quantity + fee)
      // Fee is 1% (100 bps) of total cost
      const totalCost = BigInt(Math.floor(priceNum * quantityNum));
      const fee = totalCost * BigInt(100) / BigInt(10000); // 1% fee
      const totalRequired = totalCost + fee;

      // Find a coin with sufficient balance
      let paymentCoin = suiCoins.find(c => BigInt(c.balance) >= totalRequired);
      
      if (!paymentCoin) {
        // Try to find the largest coin
        paymentCoin = suiCoins.reduce((max, coin) => 
          BigInt(coin.balance) > BigInt(max.balance) ? coin : max
        );
        
        if (BigInt(paymentCoin.balance) < totalRequired) {
          throw new Error(`Insufficient SUI balance. Required: ${Number(totalRequired) / 1e9} SUI, Available: ${Number(paymentCoin.balance) / 1e9} SUI`);
        }
      }

      // Create buy order
      const result = await createBuyOrder(
        {
          ipTokenId: selectedToken.id,
          price: Math.floor(priceNum),
          quantity: Math.floor(quantityNum),
          paymentCoinId: paymentCoin.coinObjectId,
        },
        wallet
      );

      setModalSuccess(`Buy order created successfully! Order ID: ${result.orderId?.slice(0, 10)}...`);
      setTimeout(() => {
        closeModal();
        loadMarkets(); // Refresh market data
      }, 2000);
    } catch (error: any) {
      console.error("Error creating buy order:", error);
      setModalError(error.message || "Failed to create buy order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSell = async () => {
    if (!selectedToken || !wallet || !isConnected || !address) {
      setModalError("Please connect your wallet");
      return;
    }

    if (!quantity || !price) {
      setModalError("Please enter quantity and price");
      return;
    }

    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (quantityNum <= 0 || priceNum <= 0) {
      setModalError("Quantity and price must be greater than 0");
      return;
    }

    // Note: We can't easily check IP token balance here since they're owned objects, not coins
    // The contract will reject the sell order if the user doesn't have enough tokens
    // For now, we'll just validate the input and let the contract handle the balance check

    setSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      // Create sell order
      const result = await createSellOrder(
        {
          ipTokenId: selectedToken.id,
          price: Math.floor(priceNum),
          quantity: Math.floor(quantityNum),
        },
        wallet
      );

      setModalSuccess(`Sell order created successfully! Order ID: ${result.orderId?.slice(0, 10)}...`);
      setTimeout(() => {
        closeModal();
        loadMarkets(); // Refresh market data
        loadBalances(); // Refresh balances
      }, 2000);
    } catch (error: any) {
      console.error("Error creating sell order:", error);
      setModalError(error.message || "Failed to create sell order");
    } finally {
      setSubmitting(false);
    }
  };

  const loadMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Log API base URL for debugging
      // Backend runs on port 3001 to avoid conflict with Next.js frontend (port 3000)
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      console.log('API Base URL:', apiBase);
      
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
      
      // Load initial prices from price feed
      const prices = await getAllCurrentPrices();
      const priceMap = new Map<string, PriceData>();
      prices.forEach(price => {
        priceMap.set(price.ipTokenId, price);
      });
      setPriceData(priceMap);

      // Fetch prices and metrics for each token
      const marketsData = await Promise.all(
        validTokens.map(async (token) => {
          try {
            // Try to get price from price feed first (more up-to-date)
            let price = 0;
            let priceChange = 0;
            
            const feedPrice = priceMap.get(token.id);
            if (feedPrice) {
              price = formatPrice(feedPrice.price);
              const previousPrice = feedPrice.ohlc?.open ? formatPrice(feedPrice.ohlc.open) : price;
              priceChange = previousPrice > 0 
                ? ((price - previousPrice) / previousPrice) * 100 
                : 0;
            } else {
              // Fallback to contract API if price feed doesn't have it
              try {
                const priceData: PriceResponse = await contractAPI.getPrice(token.id);
                console.log(`Price data for ${token.id}:`, priceData);
                if (priceData && priceData.price !== null && priceData.price !== undefined) {
                  const rawPrice = Number(priceData.price);
                  if (rawPrice > 0) {
                    price = rawPrice / 1000000000; // 1e9
                    console.log(`Price conversion: ${rawPrice} MIST / 1e9 = ${price} SUI`);
                    
                    if (price > 1000000) {
                      console.warn(`Price seems very high: ${price} SUI for token ${token.id}`);
                    }
                  }
                }
              } catch (priceError) {
                console.warn(`Failed to fetch price for token ${token.id}:`, priceError);
              }
            }

            // Calculate market cap (price * circulating supply)
            const circulatingSupply = token.circulatingSupply || 0;
            const marketCap = price * circulatingSupply;

            // Default values for missing data
            const change24h = priceChange || token.priceChange24h || 0;
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
      
      if (filteredMarkets.length === 0) {
        setError('No tokens found. Make sure the backend API is accessible and tokens are deployed.');
      }
    } catch (err: any) {
      console.error('Failed to load markets:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      // Backend runs on port 3001 to avoid conflict with Next.js frontend (port 3000)
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      
      // More helpful error message
      let userMessage = errorMessage;
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userMessage = `Cannot connect to backend API at ${apiBase}. Make sure the backend server is running.`;
      } else if (errorMessage.includes('404')) {
        userMessage = `Backend endpoint not found. The API at ${apiBase} may not have the tokens endpoint.`;
      } else if (errorMessage.includes('CORS')) {
        userMessage = `CORS error. The backend at ${apiBase} may not allow requests from this origin.`;
      }
      
      setError(`${userMessage} API URL: ${apiBase}`);
    } finally {
      setLoading(false);
    }
  };

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
                    {(() => {
                      const price = priceData.get(market.id);
                      const currentPrice = price ? formatPrice(price.price) : market.price;
                      return currentPrice > 0 
                        ? `${currentPrice.toFixed(6)} SUI`
                        : '-';
                    })()}
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
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => openBuyModal(market)}
                        disabled={!isConnected}
                        className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => openSellModal(market)}
                        disabled={!isConnected}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                      >
                        Sell
                      </button>
                    </div>
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

      {/* Buy/Sell Modal */}
      {selectedToken && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {modalType === "buy" ? "Buy" : "Sell"} {selectedToken.name}
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Balance Info */}
            {isConnected && (
              <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg text-sm">
                {modalType === "buy" ? (
                  <div>
                    <div className="text-zinc-400">SUI Balance:</div>
                    <div className="text-white font-semibold">{(Number(suiBalance) / 1e9).toFixed(4)} SUI</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-zinc-400">Note:</div>
                    <div className="text-white text-xs">The contract will validate your token balance when you submit the sell order.</div>
                  </div>
                )}
              </div>
            )}

            {/* Current Price Display */}
            {(() => {
              const currentPriceData = priceData.get(selectedToken.id);
              const currentPrice = currentPriceData ? formatPrice(currentPriceData.price) : selectedToken.price;
              const previousPrice = currentPriceData?.ohlc?.open ? formatPrice(currentPriceData.ohlc.open) : currentPrice;
              const priceChange = previousPrice > 0 
                ? ((currentPrice - previousPrice) / previousPrice) * 100 
                : selectedToken.change24h;
              
              return (
                <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="text-xs text-zinc-400 mb-1">Current Market Price</div>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-white">
                      {currentPrice.toFixed(6)} SUI
                    </div>
                    <div className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Price per Token (MIST)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price in MIST (1 SUI = 1e9 MIST)"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  disabled={submitting}
                />
                {price && (
                  <div className="text-xs text-zinc-500 mt-1">
                    ≈ {(parseFloat(price) / 1e9).toFixed(6)} SUI per token
                  </div>
                )}
              </div>

              {quantity && price && (
                <div className="p-3 bg-zinc-800/50 rounded-lg text-sm">
                  <div className="text-zinc-400">Total Cost:</div>
                  <div className="text-white font-semibold">
                    {((parseFloat(price) * parseFloat(quantity)) / 1e9).toFixed(6)} SUI
                    {modalType === "buy" && (
                      <span className="text-zinc-500 text-xs ml-2">
                        (including ~1% fee)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {modalError && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {modalError}
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                  {modalSuccess}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={modalType === "buy" ? handleBuy : handleSell}
                  disabled={submitting || !quantity || !price || !isConnected}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {submitting ? "Processing..." : modalType === "buy" ? "Buy" : "Sell"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
