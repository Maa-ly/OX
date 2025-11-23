"use client";

import { useState, useEffect } from "react";
import { CustomSelect } from "@/components/ui/custom-select";
import { getMarketPrice } from "@/lib/utils/contract-read";

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookProps {
  tokenId: string;
  currentPrice: number;
}

export function OrderBook({ tokenId, currentPrice }: OrderBookProps) {
  const [precision, setPrecision] = useState(2);
  const [marketPrice, setMarketPrice] = useState<{ highestBid: number; lowestAsk: number } | null>(null);

  // Generate mock order book data with function initializer
  const generateOrders = (
    basePrice: number,
    isBid: boolean
  ): OrderBookEntry[] => {
    return Array.from({ length: 15 }, (_, i) => {
      const offset = isBid ? -i * 0.1 : i * 0.1;
      const price = basePrice + offset;
      const amount = Math.random() * 1000 + 100;
      const total = price * amount;
      return { price, amount, total };
    });
  };

  // Use market price if available, otherwise use current price
  const basePrice = marketPrice?.lowestAsk || marketPrice?.highestBid || currentPrice || 0;
  const [bids] = useState<OrderBookEntry[]>(() => generateOrders(basePrice * 0.99, true));
  const [asks] = useState<OrderBookEntry[]>(() => generateOrders(basePrice * 1.01, false));

  // Fetch market price
  useEffect(() => {
    const fetchMarketPrice = async () => {
      try {
        const price = await getMarketPrice(tokenId);
        setMarketPrice(price);
      } catch (error) {
        console.error("Error fetching market price:", error);
      }
    };

    if (tokenId) {
      fetchMarketPrice();
      // Refresh every 5 seconds
      const interval = setInterval(fetchMarketPrice, 5000);
      return () => clearInterval(interval);
    }
  }, [tokenId]);

  const maxTotal = Math.max(
    ...bids.map((b) => b.total),
    ...asks.map((a) => a.total)
  );

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-zinc-800 px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Order Book</span>
        <CustomSelect
          value={String(precision)}
          onChange={(value) => setPrecision(Number(value))}
          options={[
            { value: "1", label: "0.1" },
            { value: "2", label: "0.01" },
            { value: "3", label: "0.001" },
          ]}
          className="w-20"
        />
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 text-xs text-zinc-500 border-b border-zinc-800">
        <div className="text-left">Price(SUI)</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Total</div>
      </div>

      {/* Asks (Sell Orders) */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col-reverse">
          {asks.map((ask, index) => (
            <div
              key={`ask-${index}`}
              className="relative grid grid-cols-3 gap-2 px-3 py-1 text-xs hover:bg-zinc-900/50 cursor-pointer"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <div className="relative text-red-400">
                {ask.price.toFixed(precision)}
              </div>
              <div className="relative text-right text-zinc-300">
                {ask.amount.toFixed(2)}
              </div>
              <div className="relative text-right text-zinc-500">
                {ask.total.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="sticky top-0 bg-zinc-900 border-y border-zinc-800 px-3 py-2 text-center">
          <div className="text-lg font-bold text-cyan-400">
            {marketPrice?.lowestAsk 
              ? marketPrice.lowestAsk.toFixed(6)
              : bids[0] 
              ? bids[0].price.toFixed(precision) 
              : "0.00"}
          </div>
          <div className="text-xs text-zinc-500">
            Spread:{" "}
            {marketPrice?.lowestAsk && marketPrice?.highestBid
              ? (marketPrice.lowestAsk - marketPrice.highestBid).toFixed(6)
              : asks[0] && bids[0]
              ? (asks[0].price - bids[0].price).toFixed(precision)
              : "0.00"} SUI
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        {bids.map((bid, index) => (
          <div
            key={`bid-${index}`}
            className="relative grid grid-cols-3 gap-2 px-3 py-1 text-xs hover:bg-zinc-900/50 cursor-pointer"
          >
            <div
              className="absolute right-0 top-0 bottom-0 bg-green-500/10"
              style={{ width: `${(bid.total / maxTotal) * 100}%` }}
            />
            <div className="relative text-green-400">
              {bid.price.toFixed(precision)}
            </div>
            <div className="relative text-right text-zinc-300">
              {bid.amount.toFixed(2)}
            </div>
            <div className="relative text-right text-zinc-500">
              {bid.total.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
