"use client";

import { useState } from "react";

interface Trade {
  price: number;
  amount: number;
  time: string;
  side: "buy" | "sell";
}

export function MarketTrades() {
  // Generate mock trades with function initializer
  const [trades] = useState<Trade[]>(() =>
    Array.from({ length: 20 }, (_, i) => ({
      price: 37.7 + (Math.random() - 0.5) * 0.5,
      amount: Math.random() * 100 + 10,
      time: new Date(Date.now() - i * 5000).toLocaleTimeString(),
      side: Math.random() > 0.5 ? "buy" : "sell",
    }))
  );

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      <div className="border-b border-zinc-800 px-3 py-2">
        <span className="text-sm font-semibold">Market Trades</span>
      </div>

      <div className="grid grid-cols-3 gap-2 px-3 py-2 text-xs text-zinc-500 border-b border-zinc-800">
        <div className="text-left">Price(USDC)</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Time</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trades.map((trade, index) => (
          <div
            key={index}
            className="grid grid-cols-3 gap-2 px-3 py-1 text-xs hover:bg-zinc-900/50"
          >
            <div
              className={
                trade.side === "buy" ? "text-green-400" : "text-red-400"
              }
            >
              {trade.price.toFixed(3)}
            </div>
            <div className="text-right text-zinc-300">
              {trade.amount.toFixed(2)}
            </div>
            <div className="text-right text-zinc-500">{trade.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
