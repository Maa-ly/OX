# ODX Trading Platform

A comprehensive anime/manga IP trading platform built on Next.js with spot and perpetual trading features.

## Features Implemented

### 1. **Markets Page** (`/markets`)
- Display all anime/manga IP tokens with live prices
- 24h price changes and volume
- Market cap information
- Search and filter functionality
- Direct access to trade any token

### 2. **Trade Page** (`/trade`)
- Professional trading interface similar to Binance
- **Spot Trading**: Buy and sell tokens directly
- **Perpetual Trading**: Open long/short positions with leverage (1x-100x)
- Real-time order book
- Trading chart with multiple timeframes (5m, 15m, 1h, 4h, 1D, 1W)
- Market and limit orders
- Position management panel
- Order history

### 3. **Portfolio Page** (`/portfolio`)
- Track all your assets and their values
- View active perpetual positions
- Monitor PnL (Profit and Loss)
- Transaction history
- Direct trading links

### 4. **Discover Page** (`/discover`)
- Community feed for sharing content
- Post memes, videos, images, and discussions
- Content stored on Walrus decentralized storage
- Like, comment, and share posts
- Filter by content type (images, videos, discussions)
- Tag-based organization

### 5. **Predictions & Ratings Page** (`/predictions`)
- Create predictions about anime/manga events
- Rate anime episodes and series
- Community voting system
- Earn rewards for accurate predictions
- Track your prediction performance

## Components

### Trading Components
- `TradingChart`: Interactive price chart with timeframe selection
- `OrderBook`: Real-time bid/ask orders display
- `TradePanel`: Buy/sell interface with leverage controls
- `MarketTrades`: Recent market transactions
- `PositionsPanel`: Active positions and orders management

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks
- **Blockchain**: Sui Network
- **Storage**: Walrus (for user-generated content)

## Navigation Structure

```
Home (/)
├── Markets (/markets)
├── Trade (/trade)
├── Portfolio (/portfolio)
├── Discover (/discover)
└── Predictions (/predictions)
```

## Trading Modes

### Spot Trading
- Direct buy/sell of IP tokens
- No leverage
- Instant settlement
- Use USDC as base currency

### Perpetual Trading
- Long/Short positions
- Leverage: 1x to 100x
- Margin-based trading
- Liquidation mechanism
- Funding rates

## Order Types

1. **Market Orders**: Execute immediately at current price
2. **Limit Orders**: Execute when price reaches specified level

## Next Steps for Integration

### 1. Chart Integration
Replace placeholder chart with a real charting library:
- **TradingView**: Professional charts with indicators
- **lightweight-charts**: Lightweight alternative
- Connect to real-time price data API

### 2. Backend API Integration
- Connect to Sui blockchain for token data
- Implement WebSocket for real-time updates
- Order book data feed
- Trade execution API
- Position management

### 3. Walrus Storage Integration
- Upload user-generated content (images, videos)
- Retrieve content from Walrus
- Content verification and signatures

### 4. Smart Contract Integration
- Token trading contracts
- Perpetual futures contracts
- Prediction market contracts
- Rating system contracts

### 5. Wallet Integration
- Already implemented via WalletButton component
- Connect to execute trades
- Sign transactions
- Manage positions

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

## API Endpoints Needed

1. **Market Data**
   - GET `/api/tokens` - List all tokens
   - GET `/api/tokens/:symbol` - Token details
   - GET `/api/tokens/:symbol/ohlcv` - Historical price data

2. **Trading**
   - POST `/api/orders` - Place order
   - GET `/api/orders` - Get user orders
   - DELETE `/api/orders/:id` - Cancel order
   - GET `/api/positions` - Get user positions
   - POST `/api/positions/:id/close` - Close position

3. **User Data**
   - GET `/api/portfolio` - User portfolio
   - GET `/api/transactions` - Transaction history

4. **Community**
   - GET `/api/posts` - Get community posts
   - POST `/api/posts` - Create post
   - POST `/api/predictions` - Create prediction
   - POST `/api/ratings` - Submit rating

## Design System

- **Primary Color**: Cyan (#06b6d4)
- **Secondary Color**: Blue (#3b82f6)
- **Background**: Dark (#0a0a0f)
- **Surface**: Zinc-900
- **Border**: Zinc-800
- **Success**: Green-400
- **Error**: Red-400
- **Font**: Outfit (Google Fonts)

## License

MIT
