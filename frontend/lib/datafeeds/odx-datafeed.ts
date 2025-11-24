/**
 * ODX Custom Datafeed for TradingView Charting Library
 * 
 * Connects TradingView charts to our custom price feed WebSocket/SSE
 */

import { 
  getPriceHistory, 
  getCurrentPrice,
  getPriceFeedSSE,
  formatPrice,
  type PriceHistoryPoint,
  type PriceData 
} from '@/lib/utils/price-feed';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// TradingView Bar interface
interface Bar {
  time: number; // Unix timestamp in seconds
  low: number;
  high: number;
  open: number;
  close: number;
  volume?: number;
}

interface SymbolInfo {
  ticker: string;
  name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
}

interface DatafeedConfiguration {
  supported_resolutions: string[];
  supports_group_request: boolean;
  supports_marks: boolean;
  supports_search: boolean;
  supports_timescale_marks: boolean;
}

interface PeriodParams {
  from: number; // Unix timestamp in seconds
  to: number; // Unix timestamp in seconds
  firstDataRequest: boolean;
}

interface HistoryCallback {
  (bars: Bar[], meta?: { noData?: boolean; nextTime?: number }): void;
}

interface ErrorCallback {
  (reason: string): void;
}

interface RealtimeCallback {
  (bar: Bar): void;
}

interface ResetCacheCallback {
  (): void;
}

interface OnReadyCallback {
  (configuration: DatafeedConfiguration): void;
}

interface ResolveCallback {
  (symbolInfo: SymbolInfo): void;
}

interface ResolveErrorCallback {
  (reason: string): void;
}

interface SearchSymbolsCallback {
  (symbols: Array<{
    symbol: string;
    full_name: string;
    description: string;
    exchange: string;
    ticker: string;
    type: string;
  }>): void;
}

export class ODXDatafeed {
  private ipTokenId: string;
  private symbol: string;
  private subscribers: Map<string, {
    resolution: string;
    lastBar: Bar | null;
    callback: RealtimeCallback;
    resetCacheCallback: ResetCacheCallback;
  }> = new Map();
  private sseUnsubscribe: (() => void) | null = null;
  private lastBarCache: Map<string, Bar> = new Map();

  constructor(ipTokenId: string, symbol: string) {
    this.ipTokenId = ipTokenId;
    this.symbol = symbol;
  }

  /**
   * Called when the chart is ready
   */
  onReady(callback: OnReadyCallback): void {
    setTimeout(() => {
      callback({
        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
        supports_group_request: false,
        supports_marks: false,
        supports_search: false,
        supports_timescale_marks: false,
      });
    }, 0);
  }

  /**
   * Resolve symbol information
   */
  resolveSymbol(
    symbolName: string,
    onResolve: ResolveCallback,
    onError: ResolveErrorCallback
  ): void {
    // Convert our price to SUI for display
    const pricescale = 1000000; // 6 decimal places (0.000001 SUI precision)

    const symbolInfo: SymbolInfo = {
      ticker: symbolName,
      name: this.symbol,
      description: `${this.symbol} Price Feed`,
      type: 'crypto',
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: 'ODX',
      minmov: 1,
      pricescale: pricescale,
      has_intraday: true,
      has_weekly_and_monthly: true,
      supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
      volume_precision: 2,
      data_status: 'streaming',
    };

    setTimeout(() => {
      onResolve(symbolInfo);
    }, 0);
  }

  /**
   * Get historical bars
   */
  async getBars(
    symbolInfo: SymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onHistoryCallback: HistoryCallback,
    onErrorCallback: ErrorCallback
  ): Promise<void> {
    try {
      const { from, to, firstDataRequest } = periodParams;
      
      // Fetch price history from our API
      const history = await getPriceHistory(this.ipTokenId, 1000);
      
      if (!history || history.length === 0) {
        // If no history, try to get current price and create a single bar
        const currentPrice = await getCurrentPrice(this.ipTokenId);
        if (currentPrice) {
          const price = formatPrice(currentPrice.price);
          const bar: Bar = {
            time: Math.floor(currentPrice.timestamp / 1000),
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 0,
          };
          
          setTimeout(() => {
            onHistoryCallback([bar], { noData: false });
          }, 0);
          return;
        }
        
        setTimeout(() => {
          onHistoryCallback([], { noData: true });
        }, 0);
        return;
      }

      // Convert our price history to TradingView bars
      const bars: Bar[] = history
        .filter(point => {
          const pointTime = Math.floor(point.timestamp / 1000);
          return pointTime >= from && pointTime <= to;
        })
        .map(point => ({
          time: Math.floor(point.timestamp / 1000),
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume || 0,
        }))
        .sort((a, b) => a.time - b.time);

      // If no bars in range, check if we have data before the range
      if (bars.length === 0 && history.length > 0) {
        const lastPoint = history[history.length - 1];
        const lastTime = Math.floor(lastPoint.timestamp / 1000);
        
        if (lastTime < from) {
          // Data is too old
          setTimeout(() => {
            onHistoryCallback([], { noData: true });
          }, 0);
          return;
        }
      }

      // Store the last bar for real-time updates
      if (bars.length > 0) {
        const lastBar = bars[bars.length - 1];
        this.lastBarCache.set(`${this.ipTokenId}_${resolution}`, lastBar);
      }

      const meta = {
        noData: bars.length === 0,
        nextTime: bars.length > 0 ? bars[bars.length - 1].time + this.getResolutionInSeconds(resolution) : undefined,
      };

      setTimeout(() => {
        onHistoryCallback(bars, meta);
      }, 0);
    } catch (error) {
      console.error('Error fetching bars:', error);
      setTimeout(() => {
        onErrorCallback('Failed to fetch historical data');
      }, 0);
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeBars(
    symbolInfo: SymbolInfo,
    resolution: string,
    onRealtimeCallback: RealtimeCallback,
    subscriberUID: string,
    onResetCacheNeededCallback: ResetCacheCallback
  ): void {
    console.log('[ODXDatafeed] subscribeBars:', { subscriberUID, resolution });

    // Store subscriber
    const lastBar = this.lastBarCache.get(`${this.ipTokenId}_${resolution}`);
    this.subscribers.set(subscriberUID, {
      resolution,
      lastBar: lastBar || null,
      callback: onRealtimeCallback,
      resetCacheCallback: onResetCacheNeededCallback,
    });

    // Subscribe to SSE if not already subscribed
    if (!this.sseUnsubscribe) {
      const sse = getPriceFeedSSE();
      this.sseUnsubscribe = sse.subscribe((prices) => {
        const tokenPrice = prices.find(p => p.ipTokenId === this.ipTokenId);
        if (tokenPrice) {
          this.handlePriceUpdate(tokenPrice, resolution);
        }
      });
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeBars(subscriberUID: string): void {
    console.log('[ODXDatafeed] unsubscribeBars:', subscriberUID);
    this.subscribers.delete(subscriberUID);

    // If no more subscribers, unsubscribe from SSE
    if (this.subscribers.size === 0 && this.sseUnsubscribe) {
      this.sseUnsubscribe();
      this.sseUnsubscribe = null;
    }
  }

  /**
   * Handle price update from SSE
   */
  private handlePriceUpdate(priceData: PriceData, resolution: string): void {
    const price = formatPrice(priceData.price);
    const timestamp = Math.floor(priceData.timestamp / 1000);

    // Create new bar from price update
    const newBar: Bar = {
      time: timestamp,
      open: formatPrice(priceData.ohlc.open),
      high: formatPrice(priceData.ohlc.high),
      low: formatPrice(priceData.ohlc.low),
      close: price,
      volume: 0,
    };

    // Update all subscribers
    for (const [uid, subscriber] of this.subscribers.entries()) {
      if (subscriber.resolution === resolution) {
        // Check if this is an update to the current bar or a new bar
        const lastBar = subscriber.lastBar;
        const resolutionSeconds = this.getResolutionInSeconds(resolution);
        
        if (lastBar && timestamp < lastBar.time + resolutionSeconds) {
          // Update existing bar
          const updatedBar: Bar = {
            ...lastBar,
            high: Math.max(lastBar.high, newBar.high),
            low: Math.min(lastBar.low, newBar.low),
            close: newBar.close,
          };
          subscriber.lastBar = updatedBar;
          subscriber.callback(updatedBar);
        } else {
          // New bar
          subscriber.lastBar = newBar;
          subscriber.callback(newBar);
        }
      }
    }

    // Update cache
    this.lastBarCache.set(`${this.ipTokenId}_${resolution}`, newBar);
  }

  /**
   * Get resolution in seconds
   */
  private getResolutionInSeconds(resolution: string): number {
    const resolutionMap: Record<string, number> = {
      '1': 60,           // 1 minute
      '5': 300,          // 5 minutes
      '15': 900,         // 15 minutes
      '30': 1800,        // 30 minutes
      '60': 3600,        // 1 hour
      '240': 14400,      // 4 hours
      '1D': 86400,       // 1 day
      '1W': 604800,      // 1 week
      '1M': 2592000,     // 1 month (approx)
    };
    return resolutionMap[resolution] || 60;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.sseUnsubscribe) {
      this.sseUnsubscribe();
      this.sseUnsubscribe = null;
    }
    this.subscribers.clear();
    this.lastBarCache.clear();
  }
}

