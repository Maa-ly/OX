/**
 * Price Feed Utilities
 * 
 * Provides functions to fetch and stream price feeds from the oracle
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface PriceData {
  ipTokenId: string;
  price: number; // Price in MIST (scaled by 1e9)
  timestamp: number;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
    timestamp: number;
  };
}

export interface PriceHistoryPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EngagementMetrics {
  totalEngagement: number;
  postCount: number;
  likeCount: number;
  commentCount: number;
  ratingCount: number;
  memeCount: number;
  predictionCount: number;
  stakeCount: number;
  recentEngagement: number;
  totalContributions: number;
}

/**
 * Get current price for a specific token
 */
export async function getCurrentPrice(ipTokenId: string): Promise<PriceData | null> {
  try {
    if (!API_BASE_URL || API_BASE_URL === 'http://localhost:3001') {
      console.warn('[PriceFeed] Backend API not configured. Set NEXT_PUBLIC_API_BASE_URL environment variable.');
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/price-feed/current/${ipTokenId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Price not found
      }
      // Don't throw for network errors, just return null
      if (response.status === 0 || response.status >= 500) {
        console.warn('[PriceFeed] Backend may not be deployed. See BACKEND_DEPLOYMENT.md');
        return null;
      }
      throw new Error(`Failed to fetch price: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success ? data : null;
  } catch (error) {
    // Network errors are expected if backend is not deployed
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('[PriceFeed] Cannot connect to backend. Backend may not be deployed. See BACKEND_DEPLOYMENT.md');
    } else {
      console.error('Error fetching current price:', error);
    }
    return null;
  }
}

/**
 * Get current prices for all tokens
 */
export async function getAllCurrentPrices(): Promise<PriceData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/price-feed/current`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success ? data.prices : [];
  } catch (error) {
    console.error('Error fetching all prices:', error);
    return [];
  }
}

/**
 * Get price history for a token
 */
export async function getPriceHistory(
  ipTokenId: string,
  limit: number = 100
): Promise<PriceHistoryPoint[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/price-feed/history/${ipTokenId}?limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch price history: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success ? data.history : [];
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
}

/**
 * Get OHLC data for a token
 */
export async function getOHLC(ipTokenId: string): Promise<PriceData['ohlc'] | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/price-feed/ohlc/${ipTokenId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch OHLC: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success ? data.ohlc : null;
  } catch (error) {
    console.error('Error fetching OHLC:', error);
    return null;
  }
}

/**
 * Manually trigger price update for a token
 */
export async function updatePrice(ipTokenId: string, tokenName: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/price-feed/update/${ipTokenId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: tokenName }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update price: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error updating price:', error);
    return false;
  }
}

/**
 * Price Feed SSE (Server-Sent Events) Connection
 * 
 * Connects to the price feed SSE endpoint and streams price updates
 */
export class PriceFeedSSE {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Set<(data: PriceData[]) => void> = new Set();
  private isConnecting = false;

  constructor() {
    // Auto-connect
    this.connect();
  }

  /**
   * Connect to SSE stream
   */
  private connect() {
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState === EventSource.OPEN)) {
      return;
    }

    // Check if API_BASE_URL is configured
    if (!API_BASE_URL || API_BASE_URL === 'http://localhost:3001') {
      console.warn('[PriceFeed] API_BASE_URL not configured. Backend may not be deployed. Set NEXT_PUBLIC_API_BASE_URL environment variable.');
      // Don't attempt connection if backend URL is not configured
      return;
    }

    this.isConnecting = true;
    
    try {
      const streamUrl = `${API_BASE_URL}/api/price-feed/stream`;
      this.eventSource = new EventSource(streamUrl);
      
      this.eventSource.onopen = () => {
        console.log('[PriceFeed] SSE connected to', streamUrl);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'price_update' && message.data) {
            // Notify all listeners
            this.listeners.forEach(listener => listener(message.data));
          } else if (message.type === 'connected') {
            console.log('[PriceFeed]', message.message);
          }
        } catch (error) {
          console.error('[PriceFeed] Error parsing message:', error);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('[PriceFeed] SSE error:', error);
        this.isConnecting = false;
        
        // EventSource will automatically try to reconnect
        // But we can add our own reconnection logic if needed
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          // Connection closed, attempt manual reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`[PriceFeed] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
              if (this.eventSource) {
                this.eventSource.close();
              }
              this.eventSource = null;
              this.connect();
            }, delay);
          } else {
            console.error('[PriceFeed] Max reconnection attempts reached. Backend may not be deployed. See BACKEND_DEPLOYMENT.md for deployment instructions.');
          }
        }
      };
    } catch (error) {
      console.error('[PriceFeed] Error connecting:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Subscribe to price updates
   */
  subscribe(listener: (prices: PriceData[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Close SSE connection
   */
  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
let priceFeedSSE: PriceFeedSSE | null = null;

/**
 * Get or create the price feed SSE instance
 */
export function getPriceFeedSSE(): PriceFeedSSE {
  if (!priceFeedSSE) {
    priceFeedSSE = new PriceFeedSSE();
  }
  return priceFeedSSE;
}

/**
 * Format price from MIST to SUI
 * Prices are stored with 18 decimals (like SUI tokens), so we divide by 1e18
 * to normalize to SUI units
 */
export function formatPrice(priceInMist: number): number {
  // If price is very large (> 1e15), it's likely in 18-decimal format, divide by 1e18
  // Otherwise, assume it's already in 9-decimal format (1e9)
  if (priceInMist > 1e15) {
    return priceInMist / 1e18;
  }
  return priceInMist / 1e9;
}

/**
 * Format price change percentage
 */
export function formatPriceChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

