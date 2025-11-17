"use client";

import { useState } from "react";

interface TradePanelProps {
  mode: "spot" | "perpetual";
  token: {
    symbol: string;
    price: number;
  };
}

export function TradePanel({ mode, token }: TradePanelProps) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("limit");
  const [price, setPrice] = useState(token.price.toString());
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [positionSide, setPositionSide] = useState<"long" | "short">("long");

  const availableBalance = 10000; // Mock balance

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Order submitted:", {
      side,
      orderType,
      price,
      amount,
      leverage,
    });
    // Implement order submission logic
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
                  USDC
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
                ? (Number(amount) * Number(price)).toFixed(2)
                : "0.00"}{" "}
              USDC
            </div>
          </div>

          {/* Available Balance */}
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Available</span>
            <span>{availableBalance.toFixed(2)} USDC</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              side === "buy"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            {mode === "perpetual"
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
