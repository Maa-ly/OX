"use client";

import { useState, useEffect } from "react";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { createBuyOrder, createSellOrder } from "@/lib/utils/contract";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

interface TradePanelProps {
  mode: "spot" | "perpetual";
  token: {
    id: string;
    symbol: string;
    price: number;
  };
}

export function TradePanel({ mode, token }: TradePanelProps) {
  const { wallet, isConnected, address } = useWalletAuth();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("limit");
  const [price, setPrice] = useState(token.price.toString());
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [positionSide, setPositionSide] = useState<"long" | "short">("long");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load SUI balance
  useEffect(() => {
    const loadBalance = async () => {
      if (!address) {
        setAvailableBalance(0);
        return;
      }

      try {
        const client = new SuiClient({ url: getFullnodeUrl('testnet') });
        const allCoins = await client.getAllCoins({ owner: address });
        const suiCoins = allCoins.data.filter(c => c.coinType === '0x2::sui::SUI');
        const totalBalance = suiCoins.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
        setAvailableBalance(Number(totalBalance) / 1e9); // Convert from MIST to SUI
      } catch (error) {
        console.error("Error loading balance:", error);
        setAvailableBalance(0);
      }
    };

    loadBalance();
    // Refresh balance every 10 seconds
    const interval = setInterval(loadBalance, 10000);
    return () => clearInterval(interval);
  }, [address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !wallet || !address) {
      setError("Please connect your wallet");
      return;
    }

    if (!amount || !price) {
      setError("Please enter amount and price");
      return;
    }

    const quantityNum = parseFloat(amount);
    const priceNum = parseFloat(price);

    if (quantityNum <= 0 || priceNum <= 0) {
      setError("Amount and price must be greater than 0");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (side === "buy") {
        // Get SUI coins for payment
        const client = new SuiClient({ url: getFullnodeUrl('testnet') });
        const allCoins = await client.getAllCoins({ owner: address });
        const suiCoins = allCoins.data.filter(c => c.coinType === '0x2::sui::SUI');
        
        if (suiCoins.length === 0) {
          throw new Error("No SUI coins found");
        }

        // Calculate total cost (price * quantity + fee)
        const totalCost = BigInt(Math.floor(priceNum * quantityNum * 1e9));
        const fee = totalCost * BigInt(100) / BigInt(10000); // 1% fee
        const totalRequired = totalCost + fee;

        // Find a coin with sufficient balance
        let paymentCoin = suiCoins.find(c => BigInt(c.balance) >= totalRequired);
        
        if (!paymentCoin) {
          paymentCoin = suiCoins.reduce((max, coin) => 
            BigInt(coin.balance) > BigInt(max.balance) ? coin : max
          );
          
          if (BigInt(paymentCoin.balance) < totalRequired) {
            throw new Error(`Insufficient SUI balance. Required: ${Number(totalRequired) / 1e9} SUI`);
          }
        }

        // Create buy order
        const result = await createBuyOrder(
          {
            ipTokenId: token.id,
            price: Math.floor(priceNum * 1e9), // Convert to MIST
            quantity: Math.floor(quantityNum),
            paymentCoinId: paymentCoin.coinObjectId,
          },
          wallet
        );

        alert(`Buy order created successfully! Order ID: ${result.orderId?.slice(0, 10)}...`);
        setAmount("");
      } else {
        // Create sell order
        const result = await createSellOrder(
          {
            ipTokenId: token.id,
            price: Math.floor(priceNum * 1e9), // Convert to MIST
            quantity: Math.floor(quantityNum),
          },
          wallet
        );

        alert(`Sell order created successfully! Order ID: ${result.orderId?.slice(0, 10)}...`);
        setAmount("");
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      setError(error.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Trade Type Tabs */}
      <div className="border-b border-zinc-800 flex">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            side === "buy"
              ? "text-green-400 border-b-2 border-green-400"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            side === "sell"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Trade Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Type */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrderType("limit")}
              className={`flex-1 py-2 px-3 text-xs rounded ${
                orderType === "limit"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              Limit
            </button>
            <button
              type="button"
              onClick={() => setOrderType("market")}
              className={`flex-1 py-2 px-3 text-xs rounded ${
                orderType === "market"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              Market
            </button>
          </div>

          {/* Perpetual: Position Side */}
          {mode === "perpetual" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">
                Position
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPositionSide("long")}
                  className={`flex-1 py-2 px-3 text-xs rounded ${
                    positionSide === "long"
                      ? "bg-green-500/20 text-green-400 border border-green-500/50"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setPositionSide("short")}
                  className={`flex-1 py-2 px-3 text-xs rounded ${
                    positionSide === "short"
                      ? "bg-red-500/20 text-red-400 border border-red-500/50"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  Short
                </button>
              </div>
            </div>
          )}

          {/* Perpetual: Leverage */}
          {mode === "perpetual" && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-zinc-400">Leverage</label>
                <span className="text-xs text-cyan-400">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>1x</span>
                <span>100x</span>
              </div>
            </div>
          )}

          {/* Price (for limit orders) */}
          {orderType === "limit" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Price</label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="0.00"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                  SUI
                </span>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                placeholder="0.00"
                step="0.01"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                {token.symbol}
              </span>
            </div>
          </div>

          {/* Percentage Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  const maxAmount = availableBalance / token.price;
                  setAmount(((maxAmount * pct) / 100).toFixed(2));
                }}
                className="py-1 px-2 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Total */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Total</label>
            <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300">
              {amount && price
                ? (Number(amount) * Number(price)).toFixed(6)
                : "0.00"}{" "}
              SUI
            </div>
          </div>

          {/* Available Balance */}
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Available</span>
            <span>{availableBalance.toFixed(6)} SUI</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/50 rounded px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !isConnected}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              side === "buy"
                ? "bg-green-500 hover:bg-green-600 text-white disabled:bg-zinc-700 disabled:cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white disabled:bg-zinc-700 disabled:cursor-not-allowed"
            }`}
          >
            {submitting
              ? "Submitting..."
              : !isConnected
              ? "Connect Wallet"
              : mode === "perpetual"
              ? `Open ${
                  positionSide === "long" ? "Long" : "Short"
                } ${leverage}x`
              : `${side === "buy" ? "Buy" : "Sell"} ${token.symbol}`}
          </button>
        </form>
      </div>
    </div>
  );
}
