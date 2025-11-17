"use client";

import { useState, useEffect, useRef } from "react";

interface TradingChartProps {
  symbol: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function TradingChart({
  symbol,
  isFullscreen = false,
  onToggleFullscreen,
}: TradingChartProps) {
  const [timeframe, setTimeframe] = useState("1h");
  const [chartType, setChartType] = useState("candles");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const timeframes = ["5m", "15m", "1h", "4h", "1D", "1W"];

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Set canvas size to match container
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawChart();
    };

    const drawChart = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = "#0f0f14";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 1;

      // Draw grid
      const gridSpacing = 50;
      for (let i = 0; i < height; i += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      for (let i = 0; i < width; i += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      // Draw sample candles
      const candles = Math.min(50, Math.floor(width / 15));
      const candleWidth = width / candles;
      const candleBodyWidth = candleWidth * 0.7;

      for (let i = 0; i < candles; i++) {
        const x = i * candleWidth + candleWidth / 2;
        const basePrice = height * 0.5;
        const priceRange = height * 0.3;

        const open = basePrice + (Math.random() - 0.5) * priceRange;
        const close = basePrice + (Math.random() - 0.5) * priceRange;
        const high = Math.max(open, close) + Math.random() * priceRange * 0.2;
        const low = Math.min(open, close) - Math.random() * priceRange * 0.2;

        const color = close > open ? "#22c55e" : "#ef4444";

        // Draw wick
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, candleWidth * 0.1);
        ctx.beginPath();
        ctx.moveTo(x, high);
        ctx.lineTo(x, low);
        ctx.stroke();

        // Draw body
        ctx.fillStyle = color;
        const bodyHeight = Math.abs(close - open) || 2;
        ctx.fillRect(
          x - candleBodyWidth / 2,
          Math.min(open, close),
          candleBodyWidth,
          bodyHeight
        );
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [symbol, timeframe, chartType]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Chart Controls */}
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChartType("candles")}
              className={`p-2 rounded ${
                chartType === "candles"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="Candlestick"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`p-2 rounded ${
                chartType === "line"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="Line Chart"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs rounded ${
                  timeframe === tf
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 text-zinc-500 hover:text-white"
            title="Indicators"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </button>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-zinc-500 hover:text-white"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isFullscreen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  }
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} className="flex-1 relative bg-[#0f0f14]">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}
