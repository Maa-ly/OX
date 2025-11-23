"use client";

import { useState, useEffect, useRef } from "react";
import { TradingViewChart } from "./tradingview-chart";
import { 
  getPriceHistory, 
  getCurrentPrice, 
  getPriceFeedSSE,
  formatPrice,
  type PriceHistoryPoint,
  type PriceData 
} from "@/lib/utils/price-feed";

interface TradingChartProps {
  symbol: string;
  ipTokenId?: string; // IP token ID for fetching price data
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function TradingChart({
  symbol,
  ipTokenId,
  isFullscreen = false,
  onToggleFullscreen,
}: TradingChartProps) {
  // Use TradingView chart if available, otherwise fallback to canvas
  const [useTradingView] = useState(true);

  if (useTradingView && ipTokenId) {
    return (
      <TradingViewChart
        symbol={symbol}
        ipTokenId={ipTokenId}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
      />
    );
  }

  // Fallback to original canvas implementation
  return <CanvasChart symbol={symbol} ipTokenId={ipTokenId} isFullscreen={isFullscreen} onToggleFullscreen={onToggleFullscreen} />;
}

// Original canvas implementation (kept as fallback)
function CanvasChart({
  symbol,
  ipTokenId,
  isFullscreen = false,
  onToggleFullscreen,
}: TradingChartProps) {
  const [timeframe, setTimeframe] = useState("1h");
  const [chartType, setChartType] = useState("candles");
  const [showIndicators, setShowIndicators] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const timeframes = ["5m", "15m", "1h", "4h", "1D", "1W"];

  // Load price history and subscribe to updates
  useEffect(() => {
    if (!ipTokenId) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const loadPriceData = async () => {
      try {
        setLoading(true);
        
        // Load current price
        const price = await getCurrentPrice(ipTokenId);
        setCurrentPrice(price);
        
        // Load price history
        const history = await getPriceHistory(ipTokenId, 100);
        setPriceHistory(history);
      } catch (error) {
        console.error('Error loading price data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPriceData();

    // Subscribe to real-time price updates
    const sse = getPriceFeedSSE();
    unsubscribe = sse.subscribe((prices) => {
      const tokenPrice = prices.find(p => p.ipTokenId === ipTokenId);
      if (tokenPrice) {
        setCurrentPrice(tokenPrice);
        
        // Add to history if it's a new price point
        setPriceHistory(prev => {
          const lastPoint = prev[prev.length - 1];
          if (!lastPoint || tokenPrice.timestamp > lastPoint.timestamp) {
            // Add new point to history
            return [...prev, {
              timestamp: tokenPrice.timestamp,
              open: tokenPrice.ohlc.open,
              high: tokenPrice.ohlc.high,
              low: tokenPrice.ohlc.low,
              close: tokenPrice.price,
              volume: 0, // Volume not available in current price data
            }].slice(-100); // Keep last 100 points
          }
          return prev;
        });
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [ipTokenId]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

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

      // Draw grid
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 1;
      const gridSpacing = 50;
      
      for (let i = gridSpacing; i <= height; i += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      for (let i = gridSpacing; i <= width; i += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      // Use real price data if available
      const dataToRender = priceHistory.length > 0 ? priceHistory : [];
      
      if (dataToRender.length === 0) {
        // Show loading or no data message
        ctx.fillStyle = "#6b7280";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          loading ? "Loading price data..." : "No price data available",
          width / 2,
          height / 2
        );
        return;
      }

      // Calculate price range
      const prices = dataToRender.flatMap(point => [point.high, point.low]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice || 1; // Avoid division by zero
      
      // Add padding (10% on top and bottom)
      const padding = priceRange * 0.1;
      const chartMinPrice = minPrice - padding;
      const chartMaxPrice = maxPrice + padding;
      const chartPriceRange = chartMaxPrice - chartMinPrice;

      // Price to Y coordinate conversion
      const priceToY = (price: number) => {
        const normalized = (price - chartMinPrice) / chartPriceRange;
        return height - (normalized * (height - 40)) - 20; // 20px padding top/bottom
      };

      // Draw candles or line
      const candles = Math.min(dataToRender.length, Math.floor(width / 15));
      const candleWidth = width / candles;
      const candleBodyWidth = candleWidth * 0.7;
      const startIndex = Math.max(0, dataToRender.length - candles);

      if (chartType === "candles") {
        // Draw candlesticks
        for (let i = 0; i < candles; i++) {
          const dataIndex = startIndex + i;
          const point = dataToRender[dataIndex];
          if (!point) continue;

          const x = i * candleWidth + candleWidth / 2;
          const openY = priceToY(point.open);
          const closeY = priceToY(point.close);
          const highY = priceToY(point.high);
          const lowY = priceToY(point.low);

          const isGreen = point.close >= point.open;
          const color = isGreen ? "#22c55e" : "#ef4444";

          // Draw wick
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1, candleWidth * 0.1);
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();

          // Draw body
          ctx.fillStyle = color;
          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);
          ctx.fillRect(
            x - candleBodyWidth / 2,
            bodyTop,
            candleBodyWidth,
            bodyHeight
          );
        }
      } else {
        // Draw line chart
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < candles; i++) {
          const dataIndex = startIndex + i;
          const point = dataToRender[dataIndex];
          if (!point) continue;

          const x = i * candleWidth + candleWidth / 2;
          const y = priceToY(point.close);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Draw price labels on the right
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "right";
      
      const labelCount = 5;
      for (let i = 0; i <= labelCount; i++) {
        const price = chartMaxPrice - (chartPriceRange * i / labelCount);
        const y = priceToY(price);
        ctx.fillText(formatPrice(price).toFixed(6), width - 10, y + 4);
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

      // Draw chart (no continuous animation loop, just redraw on data changes)
      drawChart();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [symbol, timeframe, chartType, priceHistory, loading]);

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
          <div className="relative">
            <button
              onClick={() => setShowIndicators(!showIndicators)}
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
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
            {showIndicators && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50">
                <div className="p-2">
                  <div className="text-xs font-semibold text-zinc-400 px-2 py-1">
                    INDICATORS
                  </div>
                  <button className="w-full text-left px-2 py-2 text-sm hover:bg-zinc-800 rounded transition-colors">
                    Moving Average
                  </button>
                  <button className="w-full text-left px-2 py-2 text-sm hover:bg-zinc-800 rounded transition-colors">
                    RSI
                  </button>
                  <button className="w-full text-left px-2 py-2 text-sm hover:bg-zinc-800 rounded transition-colors">
                    MACD
                  </button>
                  <button className="w-full text-left px-2 py-2 text-sm hover:bg-zinc-800 rounded transition-colors">
                    Bollinger Bands
                  </button>
                  <button className="w-full text-left px-2 py-2 text-sm hover:bg-zinc-800 rounded transition-colors">
                    Volume
                  </button>
                </div>
              </div>
            )}
          </div>
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
