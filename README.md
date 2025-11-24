# ODX - Otaku Data Exchange

**Transform fan engagement into a tradable, ownable asset.**

ODX is a decentralized data marketplace that enables anime, manga, and manhwa fans to own their engagement data and trade tokens representing the cultural value of their favorite IPs. Built on Sui blockchain with Walrus decentralized storage, ODX creates a new paradigm where fandom becomes an investment.

---

## Mission

**In ODX, your fandom is not just passion — it's an asset.**

ODX's mission is to democratize the value of fan engagement by:
- **Empowering fans** to own and monetize their contributions to anime/manga culture
- **Creating transparent markets** where engagement data drives real economic value
- **Rewarding early contributors** and accurate predictors who shape IP popularity
- **Building a decentralized ecosystem** where data ownership and attribution are cryptographically verifiable

---

## The Problem

### Data Ownership Crisis
- **Platforms own your data**: Traditional platforms capture and monetize user engagement without sharing value with creators
- **No attribution**: Early contributors who make content popular receive no recognition or reward
- **Centralized control**: Engagement data can be manipulated, deleted, or censored by platform operators
- **No monetization**: Fans generate valuable engagement data but can't trade or profit from it

### Market Inefficiencies
- **No price discovery**: There's no market mechanism to value the cultural significance of anime/manga IPs
- **Limited engagement types**: Most platforms only track simple metrics (views, likes) and ignore rich engagement (memes, predictions, discussions)
- **No early adopter rewards**: Fans who discover and promote content early receive no benefit when it becomes popular

---

## The Solution

ODX solves these problems by creating a **decentralized data marketplace** where:

### 1. **Users Own Their Data**
Every contribution (ratings, memes, predictions, stakes) is stored on **Walrus decentralized storage** with cryptographic proof of ownership via wallet signatures. Users can verify their contributions independently, and data is immutable and timestamped.

### 2. **IP Tokens Represent Engagement Value**
Each anime/manga IP has a corresponding token that represents its aggregated engagement value. Token prices are calculated from real engagement data stored on Walrus, creating transparent price discovery based on genuine community interest.

### 3. **Comprehensive Engagement Tracking**
ODX tracks ALL types of engagement:
- **Ratings & Reviews**: User ratings and written reviews
- **Memes & Content**: User-generated memes, posts, and creative content
- **Predictions**: Episode release predictions and token price predictions
- **Stakes**: Users can stake tokens on predictions to show confidence
- **Social Signals**: Shares, discussions, and viral content

### 4. **Fair Attribution & Rewards**
The protocol tracks who contributed what and when, enabling:
- **Early contributor bonuses**: First contributors to an IP receive bonus tokens
- **Prediction accuracy rewards**: Correct predictions earn additional rewards
- **Viral content rewards**: Content that drives engagement gets rewarded
- **Network effects**: Users who bring others to engage receive a share

### 5. **Tradable Markets**
Users can:
- **Trade IP tokens** on the marketplace (buy/sell orders)
- **Speculate on engagement trends** through token trading
- **Profit from early engagement** by selling tokens when IPs become popular

---

## How Users Interact with the Protocol

### For Fans & Contributors

#### 1. **Engage with IPs**
Users can contribute in multiple ways:

**Rate & Review:**
- Rate anime/manga titles (1-10 scale)
- Write detailed reviews
- Data stored on Walrus with wallet signature

**Create Content:**
- Post memes, images, or videos related to IPs
- Share creative content that can go viral
- Viral content significantly boosts engagement metrics

**Make Predictions:**
- Predict episode release dates
- Predict token price movements (rises/dips)
- Optionally stake tokens on predictions to show confidence

**Stake on Predictions:**
- Stake tokens on other users' predictions
- Earn rewards if predictions are accurate
- Show community confidence in predictions

#### 2. **Earn Rewards**
- Receive IP tokens from reserve pools based on contribution value
- Early contributors get bonus multipliers
- Accurate predictions earn additional rewards
- Viral content creators receive recognition and rewards

#### 3. **Trade Tokens**
- Buy IP tokens expecting price to rise with engagement
- Sell tokens when IPs become popular
- Trade on the marketplace with buy/sell orders
- View real-time price feeds and market data

### For Traders & Speculators

#### 1. **Market Analysis**
- View aggregated engagement metrics for each IP
- Track price trends and market sentiment
- Analyze contributor activity and growth rates

#### 2. **Trading**
- Create buy orders to acquire IP tokens
- Create sell orders to exit positions
- Execute trades on the order book marketplace
- Monitor real-time price updates

#### 3. **Portfolio Management**
- Track holdings across multiple IP tokens
- View portfolio performance and P&L
- Monitor engagement trends affecting token prices

---

## How Walrus Powers the Data Marketplace

**Walrus is the foundational infrastructure that makes ODX's data ownership model possible.** It's not just storage—it's the decentralized data marketplace engine that enables true ownership, verification, and value creation.

### Why Walrus is Critical

#### 1. **True Data Ownership**
- Each engagement is stored on Walrus with a **wallet signature**
- Users cryptographically prove ownership of their data
- Data is **immutable** and **timestamped**
- Users can verify their contributions independently

#### 2. **Decentralized & Trustless Storage**
- **No single point of failure**: Data isn't stored on one server
- **Censorship resistant**: Can't be taken down by authorities
- **Transparent**: Anyone can verify data exists and hasn't been tampered with
- **Permanent**: Data persists even if ODX platform shuts down

#### 3. **Data Integrity for Price Calculation**
The complete data flow:
```
User Engagement → Stored on Walrus → Oracle Reads → Aggregates → Updates Token Price
```

**Why this matters:**
- Token prices are based on **real engagement data** from Walrus
- Oracle can verify data authenticity via wallet signatures
- Prevents fake engagement manipulation
- Ensures price reflects genuine community interest

#### 4. **Attribution & Reward Verification**
**How it works:**
1. User rates/predicts/posts on an IP
2. Engagement stored on Walrus with wallet signature
3. Oracle service reads Walrus data
4. Smart contract verifies signature matches user wallet
5. Contributor record created/updated
6. Rewards distributed based on verified contributions

**Without Walrus:**
- Can't prove who made which engagement
- Rewards could be gamed with fake accounts
- No way to verify early contributor claims
- Attribution disputes can't be resolved

**With Walrus:**
- Cryptographic proof of who created what
- Timestamp proves early engagement
- Immutable record prevents disputes
- Transparent reward calculation

### Walrus as the Data Marketplace Engine

#### What Gets Stored on Walrus

**All Contribution Types:**
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df...",
  "engagement_type": "rating|meme|prediction|stake",
  "rating": 9,
  "content_cid": "bafybeigdyrzt5sfp7...",
  "prediction": "Will rise 30% this week",
  "stake_amount": 500,
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

#### How Oracle Uses Walrus Data

1. **Query All Contributions**: Oracle queries Walrus for ALL contributions for an IP token:
   - Ratings and reviews
   - Memes and posts
   - Episode predictions
   - Token price predictions
   - Stakes on predictions
   - Shares and promotions

2. **Verify Signatures**: Ensures data wasn't tampered with

3. **Aggregate Comprehensive Metrics**:
   - Average ratings
   - Total contributors
   - Meme/post counts (viral content weighted)
   - Prediction counts and accuracy
   - Total stake volume
   - Engagement growth rates
   - Viral content scores

4. **Update On-Chain**: Calls smart contract functions to update metrics and recalculate token prices

### The Complete Data Flow

```
┌─────────────┐
│   User      │
│  (Wallet)   │
└──────┬──────┘
       │
       │ 1. User rates/predicts/posts
       ▼
┌─────────────────────────────────┐
│      Frontend Application       │
│  - Rating interface             │
│  - Prediction form              │
│  - Content upload               │
│  - Wallet connection            │
└──────┬──────────────────────────┘
       │
       │ 2. Sign engagement with wallet
       ▼
┌─────────────────────────────────┐
│         Walrus Storage          │
│  - Stores engagement JSON       │
│  - Includes wallet signature    │
│  - Returns Content ID (CID)     │
│  - Immutable & timestamped      │
│  - Decentralized marketplace    │
└──────┬──────────────────────────┘
       │
       │ 3. Oracle service reads
       ▼
┌─────────────────────────────────┐
│      Oracle Service             │
│  - Queries Walrus by IP         │
│  - Verifies signatures          │
│  - Aggregates ALL metrics       │
│  - Calculates growth rates      │
└──────┬──────────────────────────┘
       │
       │ 4. Updates on-chain
       ▼
┌─────────────────────────────────┐
│    Sui Smart Contracts          │
│  - Updates EngagementMetrics    │
│  - Recalculates token price     │
│  - Updates contributor records  │
│  - Triggers reward distribution │
└─────────────────────────────────┘
```

### Benefits of Walrus Integration

**For Users:**
- ✅ **Own Your Data**: Cryptographic proof of your contributions
- ✅ **Portable**: Data follows you, not the platform
- ✅ **Verifiable**: Can prove you were early contributor
- ✅ **Immutable**: Your engagement can't be deleted or changed

**For the Platform:**
- ✅ **Trustless**: Don't need to trust platform - data is on Walrus
- ✅ **Transparent**: All engagement data is publicly verifiable
- ✅ **Accurate Pricing**: Token prices based on real, verified data
- ✅ **Fair Rewards**: Can't game the system with fake engagements

**For Token Holders:**
- ✅ **Real Value**: Token prices reflect genuine community engagement
- ✅ **Data Integrity**: Can verify metrics independently
- ✅ **Price Discovery**: Oracle-driven pricing based on real data

---

## Architecture Overview

### Core Components

1. **Smart Contracts (Sui)**
   - IP token creation and management
   - Marketplace for trading tokens
   - Oracle for price updates
   - Reward distribution system

2. **Walrus Storage**
   - Decentralized storage for all user contributions
   - Cryptographic proof of ownership
   - Immutable engagement records

3. **Oracle Service**
   - Reads engagement data from Walrus
   - Verifies wallet signatures
   - Aggregates comprehensive metrics
   - Updates smart contracts with metrics

4. **Frontend Application**
   - Wallet connection (Sui wallet)
   - Engagement interface (ratings, predictions, content)
   - Marketplace UI (trading, charts, analytics)
   - Dashboard (token stats, portfolio, leaderboards)

5. **Backend API**
   - RESTful API for frontend
   - Walrus integration endpoints
   - Oracle operations
   - Contribution indexing

---

## Project Structure

```
OX/
├── backend/                   # Backend API service
│   ├── src/
│   │   ├── server.js          # Express server setup
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic services
│   │   └── utils/             # Utilities
│   └── README.md
├── frontend/                  # Frontend application (Next.js)
│   ├── app/                   # Next.js app directory
│   ├── components/            # React components
│   └── lib/                   # Utilities and hooks
├── smartcontract/             # Sui smart contracts
│   └── odx/
│       └── sources/
│           ├── token.move     # IP token implementation
│           ├── marketplace.move # Trading marketplace
│           ├── oracle.move    # Price oracle
│           └── datatypes.move # Shared data types
├── oracle/                    # Oracle service
│   └── src/                   # Oracle logic
└── README.md                  # This file
```

---

## Getting Started

### Prerequisites

1. **Sui Wallet**: Configure Sui CLI and wallet for testnet
2. **Walrus CLI**: Install Walrus via `suiup install walrus@testnet`
3. **Node.js & pnpm**: Install Node.js and pnpm package manager

### Installation

See individual component READMEs for detailed setup:
- [Backend Setup](backend/README.md)
- Frontend setup (coming soon)
- Smart contract deployment (coming soon)

### Quick Start

1. **Deploy Smart Contracts**
   ```bash
   cd smartcontract
   sui client publish --gas-budget 100000000
   ```

2. **Start Backend Service**
   ```bash
   cd backend
   pnpm install
   pnpm run dev
   ```

3. **Start Frontend**
   ```bash
   cd frontend
   pnpm install
   pnpm run dev
   ```

---

## Documentation

- [Project Concept](project-concept.md) - Detailed protocol design
- [Walrus Integration](WALRUS_INTEGRATION.md) - Why Walrus is critical
- [Walrus Integrator Guide](WALRUS_INTEGRATOR_GUIDE.md) - Technical integration guide
- [Backend API Documentation](backend/README.md) - Backend service documentation

---

## Vision

ODX transforms fan engagement into a **tradable, ownable asset**.

Fans don't just consume content — they **invest in the cultural value** of the series they love. Their engagement data becomes valuable, and they can profit from being early contributors or accurate predictors.

**The Goal:** Make ODX the biggest, most dynamic platform for all otakus! Every contribution matters:
- Your meme can go viral and boost the token price
- Your prediction can be accurate and earn rewards
- Your stake shows confidence and affects market sentiment
- Your post can spark discussions and increase engagement
- Your rating contributes to overall IP score

---

## Resources

- [Walrus Developer Guide](https://docs.wal.app/dev-guide/dev-guide.html) - Official Walrus docs
- [Sui Documentation](https://docs.sui.io) - Sui blockchain docs
- [Sui TypeScript SDK](https://docs.sui.io/build/sui-typescript-sdk) - SDK documentation

---

## License

MIT
