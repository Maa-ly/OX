# ODX Price Feed Aggregator & Pricing System

## Overview

The ODX Price Feed Aggregator is a comprehensive system that orchestrates price generation for IP tokens based on multiple data sources. It aggregates user engagement data (posts, likes, comments, ratings, memes, predictions, stakes) from the platform, combines it with external verifiable data from Nautilus enclaves, and generates real-time price feeds that are streamed to the frontend.

## Architecture

### Core Components

1. **PriceFeedService** (`backend/src/services/price-feed.js`)
   - Main orchestrator that coordinates all price calculations
   - Manages price history and OHLC (Open, High, Low, Close) data
   - Handles real-time streaming via SSE (Server-Sent Events)
   - Implements fallback mechanisms for price stagnation and drops

2. **AggregationService** (`backend/src/services/aggregation.js`)
   - Aggregates metrics from Walrus contributions (user-generated data)
   - Combines Walrus metrics with Nautilus external metrics
   - Calculates weighted averages and combined scores

3. **WalrusIndexerService** (`backend/src/services/walrus-indexer.js`)
   - Indexes and queries user contributions stored on Walrus
   - Tracks posts, likes, comments, ratings, memes, predictions, and stakes

4. **NautilusService** (`backend/src/services/nautilus.js`)
   - Fetches verifiable external data from sources like MyAnimeList, AniList, MangaDex
   - Provides signed attestations for external metrics
   - Ensures data integrity through cryptographic signatures

## Data Flow

### 1. Data Collection

```
User Actions (Frontend)
    ↓
Discover Page (Posts, Likes, Comments)
    ↓
Walrus Storage (Decentralized)
    ↓
WalrusIndexerService (Indexes contributions)
    ↓
PriceFeedService (Aggregates engagement)
```

**Engagement Sources:**
- **Posts**: User-created posts on the discover page
- **Likes**: Likes on posts
- **Comments**: Comments on posts
- **Ratings**: User ratings for IP tokens
- **Memes**: Meme contributions
- **Predictions**: Episode and price predictions
- **Stakes**: User stakes on predictions

### 2. External Data Integration

```
Nautilus Enclave
    ↓
External APIs (MyAnimeList, AniList, MangaDex)
    ↓
Signed Metrics (Cryptographically verified)
    ↓
NautilusService (Fetches & validates)
    ↓
AggregationService (Combines with user data)
```

### 3. Price Calculation

```
Engagement Metrics + External Metrics
    ↓
AggregationService (Weighted combination)
    ↓
PriceFeedService (Calculates price change)
    ↓
OHLC Update (Open, High, Low, Close)
    ↓
Price History Storage
    ↓
Real-time Broadcast (SSE Stream)
```

## Pricing Algorithm

### Base Price Calculation

The price is calculated using the following formula:

```
newPrice = basePrice × (1 + engagementChange / 100)
```

Where:
- `basePrice`: Current price or minimum price (0.001 SUI = 1,000,000 MIST)
- `engagementChange`: Total engagement points × engagement multiplier

### Engagement Scoring

Each type of engagement has a weight that determines its impact on price:

| Engagement Type | Weight | Points per Unit |
|----------------|--------|-----------------|
| Post | 1.0 | 1.0 point |
| Like | 0.1 | 0.1 points |
| Comment | 0.3 | 0.3 points |
| Rating | 0.5 | 0.5 points |
| Meme | 1.5 | 1.5 points |
| Prediction | 2.0 | 2.0 points |
| Stake | 3.0 | 3.0 points |

**Example:**
- 10 posts = 10 points
- 50 likes = 5 points
- 20 comments = 6 points
- 5 memes = 7.5 points
- **Total = 28.5 engagement points**

### Engagement Multiplier

The engagement multiplier determines how much each engagement point affects the price:

- **Default**: `0.001` (0.1% per engagement point)
- **Formula**: `priceChange = engagementPoints × 0.001 × 100%`

**Example:**
- 28.5 engagement points × 0.001 = 2.85% price increase
- If base price is 0.01 SUI, new price = 0.01 × 1.0285 = 0.010285 SUI

### External Metrics Boost

When Nautilus external metrics are available, they provide an additional boost:

```
externalBoost = (externalPopularityScore / 10000) × 0.1
newPrice = newPrice × (1 + externalBoost)
```

- Maximum boost: 10% from external metrics
- Normalized to prevent extreme price swings

### Combined Metrics Weighting

The system combines user (Walrus) and external (Nautilus) metrics with a 60/40 split:

- **60% weight**: User engagement data (Walrus)
- **40% weight**: External verifiable data (Nautilus)

This ensures that community engagement drives price while external truth provides stability.

## Fallback Mechanisms

### 1. 50% Drop Threshold

If the price drops more than 50% from its last high, the system caps the price at 50% of the high:

```javascript
if (newPrice < high × 0.5) {
  newPrice = high × 0.5; // Cap at 50% of high
}
```

**Purpose**: Prevents extreme price crashes and maintains token value stability.

### 2. 48-Hour Stagnation Detection

If the price hasn't changed for more than 48 hours, the system applies a gradual price reduction:

```javascript
if (hoursSinceUpdate > 48) {
  hoursStagnant = hoursSinceUpdate - 48;
  dropRate = hoursStagnant × 0.01; // 1% per hour
  newPrice = newPrice × (1 - dropRate);
}
```

**Purpose**: Encourages continued engagement and prevents stale prices from remaining artificially high.

**Example:**
- Price stagnant for 72 hours (24 hours beyond threshold)
- Drop rate = 24 × 0.01 = 0.24 (24% reduction)
- If price was 0.01 SUI, new price = 0.01 × 0.76 = 0.0076 SUI

### 3. Minimum Price Floor

The system enforces a minimum price to prevent tokens from going to zero:

- **Minimum Price**: 0.001 SUI (1,000,000 MIST)
- **Purpose**: Maintains token value and prevents complete devaluation

## OHLC (Open, High, Low, Close) Tracking

The system tracks standard financial metrics for each token:

- **Open**: Price at the start of the day
- **High**: Highest price during the day
- **Low**: Lowest price during the day
- **Close**: Current/latest price

**Daily Reset:**
- OHLC resets every 24 hours
- New day's open = previous day's close
- High and low reset to current price

**Price History:**
- Stores up to 1000 price points per token
- Used for charting and historical analysis
- Automatically pruned to prevent memory issues

## Real-Time Price Streaming

### Server-Sent Events (SSE)

The system uses SSE for real-time price updates:

**Endpoint**: `GET /api/price-feed/stream`

**Connection Flow:**
1. Frontend connects to SSE endpoint
2. Server sends initial price snapshot
3. Server broadcasts updates whenever prices change
4. Frontend receives updates and updates UI

**Update Frequency:**
- Price calculations: Every 60 seconds (configurable)
- Broadcasts: Immediately after each price update

**Message Format:**
```json
{
  "type": "price_update",
  "data": [
    {
      "ipTokenId": "0x...",
      "price": 1000000000,
      "timestamp": 1234567890,
      "ohlc": {
        "open": 1000000000,
        "high": 1100000000,
        "low": 950000000,
        "close": 1050000000,
        "timestamp": 1234567890
      }
    }
  ]
}
```

### REST API Endpoints

**Get Current Price:**
- `GET /api/price-feed/current/:ipTokenId`
- Returns current price and OHLC data for a specific token

**Get All Current Prices:**
- `GET /api/price-feed/current`
- Returns current prices for all tokens

**Get Price History:**
- `GET /api/price-feed/history/:ipTokenId?limit=100`
- Returns historical price points for charting

**Get OHLC Data:**
- `GET /api/price-feed/ohlc/:ipTokenId`
- Returns current OHLC data

**Manual Price Update:**
- `POST /api/price-feed/update/:ipTokenId`
- Triggers immediate price recalculation

## Configuration

### Price Feed Configuration

Located in `PriceFeedService` constructor:

```javascript
{
  // Engagement multiplier (how much engagement affects price)
  engagementMultiplier: 0.001, // 0.1% per engagement point
  
  // Engagement weights
  weights: {
    post: 1.0,
    like: 0.1,
    comment: 0.3,
    rating: 0.5,
    meme: 1.5,
    prediction: 2.0,
    stake: 3.0,
  },
  
  // Fallback thresholds
  dropThreshold: 0.5,      // 50% drop from high
  stagnationHours: 48,     // 48 hours of no change
  stagnationDropRate: 0.01, // 1% drop per hour after stagnation
  
  // Update interval
  updateInterval: 60000,   // 60 seconds (1 minute)
  
  // Minimum price
  minPrice: 1000000,       // 0.001 SUI (in MIST)
}
```

### Updating Configuration

Configuration can be updated at runtime via:

```
POST /api/price-feed/config
Content-Type: application/json

{
  "engagementMultiplier": 0.002,
  "updateInterval": 30000
}
```

## Price Calculation Examples

### Example 1: New Token with Initial Engagement

**Initial State:**
- Base price: 0.001 SUI (minimum)
- Engagement: 0 points

**After User Activity:**
- 5 posts created: 5 points
- 30 likes received: 3 points
- 10 comments: 3 points
- **Total: 11 engagement points**

**Price Calculation:**
- Engagement change = 11 × 0.001 = 0.011 (1.1%)
- New price = 0.001 × 1.011 = 0.001011 SUI

### Example 2: Established Token with High Engagement

**Current State:**
- Current price: 0.05 SUI
- Engagement: 500 points
- External boost: 5% (from Nautilus)

**Price Calculation:**
- Engagement change = 500 × 0.001 = 0.5 (50%)
- Base new price = 0.05 × 1.5 = 0.075 SUI
- With external boost = 0.075 × 1.05 = 0.07875 SUI

### Example 3: Price Stagnation

**Current State:**
- Current price: 0.02 SUI
- Last update: 72 hours ago
- High: 0.025 SUI

**Price Calculation:**
- Hours stagnant = 72 - 48 = 24 hours
- Stagnation drop = 24 × 0.01 = 0.24 (24%)
- New price = 0.02 × 0.76 = 0.0152 SUI

### Example 4: Price Drop Protection

**Current State:**
- Current price: 0.01 SUI
- High: 0.02 SUI
- Calculated new price: 0.008 SUI (would be 60% drop)

**Price Calculation:**
- Drop from high = (0.008 / 0.02) = 0.4 (40% of high)
- Since 0.4 < 0.5, price is capped at 0.02 × 0.5 = 0.01 SUI
- Final price: 0.01 SUI (protected from further drop)

## Integration Points

### Frontend Integration

The frontend integrates with the price feed through:

1. **Initial Load**: Fetches current prices via REST API
2. **Real-Time Updates**: Subscribes to SSE stream
3. **Price Display**: Shows prices in token cards, modals, and trading charts
4. **Chart Data**: Fetches price history for OHLC charts

**Key Files:**
- `frontend/lib/utils/price-feed.ts`: Price feed client utilities
- `frontend/app/trade/page.tsx`: Trading page with real-time prices
- `frontend/app/marketplace/page.tsx`: Marketplace with price cards
- `frontend/app/markets/page.tsx`: Markets table with live prices

### Backend Integration

The backend integrates with:

1. **Walrus**: Reads user contributions from decentralized storage
2. **Nautilus**: Fetches external verifiable metrics
3. **Smart Contracts**: Reads token data and on-chain information
4. **MongoDB**: Stores price history (optional, currently in-memory)

## Performance Considerations

### Update Frequency

- **Default**: 60 seconds between price updates
- **Configurable**: Can be adjusted based on system load
- **Trade-off**: More frequent updates = more accurate prices but higher server load

### Memory Management

- **Price History**: Limited to 1000 points per token
- **Current Prices**: Cached in memory for fast access
- **Connection Management**: SSE connections are cleaned up on disconnect

### Scalability

- **Horizontal Scaling**: Multiple instances can run independently
- **State Management**: Currently in-memory (can be moved to Redis/DB)
- **Connection Pooling**: SSE connections are lightweight

## Monitoring & Debugging

### Logging

The system logs:
- Price updates and calculations
- Engagement metric aggregation
- Fallback mechanism triggers
- Connection events (SSE/WebSocket)

### Metrics to Monitor

1. **Price Update Frequency**: Should match configured interval
2. **Engagement Points**: Track total engagement per token
3. **Price Volatility**: Monitor price changes over time
4. **Connection Count**: Track active SSE connections
5. **Fallback Triggers**: Monitor stagnation and drop threshold activations

## Future Enhancements

### Potential Improvements

1. **Persistent Storage**: Move price history to MongoDB/Redis
2. **Advanced Metrics**: Add volume-weighted average price (VWAP)
3. **Price Prediction**: ML-based price forecasting
4. **Multi-Timeframe OHLC**: Support for 1h, 4h, 1D, 1W timeframes
5. **Price Alerts**: Notify users of significant price changes
6. **Market Depth**: Integrate order book data for better price discovery

## Troubleshooting

### Common Issues

**Prices Not Updating:**
- Check if PriceFeedService is started
- Verify engagement data is being indexed
- Check backend logs for errors

**SSE Connection Drops:**
- Check network connectivity
- Verify backend is accessible
- Check browser console for errors

**Prices Seem Incorrect:**
- Verify engagement weights configuration
- Check if fallback mechanisms are triggering
- Review engagement metrics aggregation

**High Server Load:**
- Increase update interval
- Reduce price history retention
- Optimize engagement query performance

## Conclusion

The ODX Price Feed Aggregator provides a robust, real-time pricing system that combines user engagement with external verifiable data. It ensures price stability through fallback mechanisms while rewarding active community participation. The system is designed to be scalable, configurable, and transparent, providing accurate price feeds for the ODX trading platform.

