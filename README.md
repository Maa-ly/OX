# ODX - Otaku Data Exchange

**A Decentralized Data Market for Anime, Manga & Manhwa Fandom**

ODX transforms fan engagement into a tradable, ownable asset. Think of it as a stock market, but instead of trading company shares, users trade tokens that represent the engagement and popularity of anime, manga, and manhwa IPs.tlius

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [How It Works](#how-it-works)
4. [Walrus: The Core of Our Data Market](#walrus-the-core-of-our-data-market)
5. [Architecture](#architecture)
6. [Key Features](#key-features)
7. [Project Structure](#project-structure)
8. [Getting Started](#getting-started)
9. [Documentation](#documentation)

---

## Problem Statement

### The Centralized Data Problem

Fan engagement data is valuable, but currently controlled by centralized platforms:

- **Fans generate valuable data** (likes, ratings, votes, predictions, memes, posts) that disappears into centralized databases
- **Users can't monetize their engagement** - platforms profit from user data while users get nothing
- **No data ownership** - users can't prove they created specific engagements or claim historical contributions
- **Data manipulation risk** - centralized platforms can alter, delete, or censor user data
- **Lack of transparency** - creators and fans lack transparent insights into genuine fan sentiment and trends
- **No attribution** - early contributors and viral content creators can't prove their impact

### The Trust Problem

Without decentralized storage:
- Can't verify who made which engagement
- Rewards could be gamed with fake accounts
- No way to prove early contributor claims
- Attribution disputes can't be resolved
- Token prices could be manipulated with fake engagement

---

## Solution Overview

ODX solves these problems by creating a **decentralized data market** where:

1. **Fans own their data** - All engagement is stored on Walrus with cryptographic proof of ownership
2. **Data becomes valuable** - Engagement data is aggregated into tokenized assets (IP Tokens)
3. **Contributors are rewarded** - Early and high-value contributors earn tokens
4. **Transparent pricing** - Token prices reflect real, verifiable community engagement
5. **Tradable assets** - Users can buy, sell, and trade IP tokens on a marketplace

**Simply put: Fans own the data they generate, and that data has real value.**

---

## How It Works

### 1. Token Creation & Supply

- **Admin creates IP tokens** for anime/manga/manhwa IPs (e.g., Chainsaw Man, One Piece, Solo Leveling)
- **Fixed supply**: Each IP token has a limited supply (e.g., 200k tokens)
- **Initial distribution**: 
  - Portion held by admin/platform
  - Reserve pool for contributor rewards
  - Initial distribution to early adopters

### 2. Fan Engagement & Data Ownership

Fans interact with the platform through multiple contribution types:

- **Ratings and reviews** - Rate anime/manga titles (1-10 scale)
- **Memes and posts** - Create and share content (images, videos, text)
- **Episode predictions** - Predict episode release dates
- **Token price predictions** - Predict token price movements
- **Stakes** - Stake tokens on predictions to show confidence
- **Shares and promotions** - Share content to drive engagement

**Each engagement is:**
- Stored on **Walrus** (decentralized storage)
- Signed with user's **wallet** (cryptographic proof of ownership)
- **Timestamped** and **immutable**
- Associated with specific **IP token IDs**

### 3. Data Aggregation & Token Value

All fan submissions for a particular IP are aggregated to form a **Data Profile**:

**Token metrics include:**
- Average ratings across all contributors
- Total number of unique contributors
- Number of memes/posts created (viral content weighted higher)
- Number of predictions made and their accuracy
- Total stake volume (shows community confidence)
- Engagement growth rate (new contributions over time)
- Viral content scores

**Token price calculation:**
```
Engagement data from Walrus → Oracle Service → Aggregated Metrics → Token Price
```

Price increases as engagement/popularity grows, reflecting genuine community interest.

### 4. Attribution & Rewards

The platform tracks and rewards contributors based on:

- **Early Engagement** - First contributors to an IP get bonus tokens
- **Prediction Accuracy** - Correct predictions earn more rewards
- **Viral Contributions** - Content that drives engagement gets rewarded
- **Network Effects** - Users who bring others to engage get a share

Rewards are distributed from the reserve pool proportionally to contribution value and timing.

### 5. Marketplace Trading

Users can:

- **Buy/sell IP tokens** on the marketplace (spot trading)
- **Trade perpetual futures** on token prices (advanced trading)
- **Speculate** on future engagement trends

Price discovery combines:
- **Oracle-driven pricing** - Based on aggregated engagement data from Walrus
- **Market-driven pricing** - Supply/demand from trades
- **Hybrid model** - Oracle sets base price, market adds premium

### 6. Complete User Flow Example

1. **Lydia engages early** with Chainsaw Man:
   - Rates it 10/10
   - Posts a viral meme
   - Predicts "Will trend top 3 next week"
   - Stakes 100 tokens on her prediction
   - All data stored on Walrus with her wallet signature

2. **Oracle service** reads Walrus data:
   - Queries all Chainsaw Man contributions
   - Verifies wallet signatures
   - Aggregates comprehensive metrics (ratings, memes, posts, predictions, stakes)
   - Calculates engagement growth rate

3. **Smart contract updates**:
   - Updates engagement metrics on-chain
   - Recalculates $CSM token price based on total engagement
   - Marks Lydia as early contributor
   - Triggers reward distribution

4. **Lydia receives rewards**:
   - $CSM tokens from reserve pool
   - Bonus for early participation
   - Bonus for viral meme
   - Potential bonus if prediction is accurate

5. **Marketplace activity**:
   - Traders buy $CSM tokens expecting price to rise
   - If engagement spikes (new season, viral content), price rises
   - Early contributors like Lydia can sell for profit

---

## Walrus: The Core of Our Data Market

**Walrus is not optional—it's the foundation of ODX's value proposition.**

### Why Walrus is Essential

#### 1. True Data Ownership

**Without Walrus:**
- Centralized databases mean the platform owns your data
- Users can't prove they created specific engagements
- Data can be manipulated or deleted by platform operators
- No way to verify historical engagement claims

**With Walrus:**
- Each engagement is stored on Walrus with a **wallet signature**
- Users cryptographically prove ownership of their data
- Data is **immutable** and **timestamped**
- Users can verify their contributions independently

#### 2. Decentralized & Trustless Storage

**Key Benefits:**
- **No Single Point of Failure** - Data isn't stored on one server
- **Censorship Resistant** - Can't be taken down by authorities
- **Transparent** - Anyone can verify data exists and hasn't been tampered with
- **Permanent** - Data persists even if ODX platform shuts down

#### 3. Data Integrity for Price Calculation

**The Flow:**
```
User Engagement → Stored on Walrus → Oracle Reads → Aggregates → Updates Token Price
```

**Why This Matters:**
- Token prices are based on **real engagement data**
- Oracle can verify data authenticity via wallet signatures
- Prevents fake engagement manipulation
- Ensures price reflects genuine community interest

#### 4. Attribution & Reward Verification

**How It Works:**
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

### How Walrus Powers the Data Market

#### Comprehensive Contribution Storage

Walrus stores **ALL** contribution types that affect token price:

**Rating/Review:**
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df2465c7b9a88e9769a625b3af0afbf41ab61d86183d85eb5fa5b7bd0549c71",
  "engagement_type": "rating",
  "rating": 9,
  "review_text": "Amazing anime!",
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

**Meme/Post:**
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df...",
  "engagement_type": "meme",
  "content_cid": "bafybeigdyrzt5sfp7...",
  "caption": "When Denji meets Power",
  "tags": ["funny", "chainsaw-man"],
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

**Episode Prediction:**
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df...",
  "engagement_type": "episode_prediction",
  "prediction": "Episode 12 releases on Dec 25, 2024",
  "stake_amount": 100,
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

**Token Price Prediction:**
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df...",
  "engagement_type": "price_prediction",
  "prediction": "Will rise 30% this week",
  "prediction_type": "rise",
  "predicted_percentage": 30,
  "stake_amount": 500,
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

**Stake on Prediction:**
```json
{
  "prediction_cid": "bafybeigdyrzt5sfp7...",
  "user_wallet": "0x6df...",
  "engagement_type": "stake",
  "stake_amount": 200,
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

#### Price Calculation Process

When token price needs to update:

1. **Oracle service queries Walrus** for ALL contributions for an IP token:
   - All ratings and reviews
   - All memes and fun posts
   - All episode predictions
   - All token price predictions
   - All stakes on predictions
   - All shares and promotions

2. **Calculates comprehensive metrics**:
   - Average rating across all users
   - Total number of unique contributors
   - Number of memes posted (viral memes weighted higher)
   - Number of posts created
   - Number of predictions made
   - Total stakes placed (shows community confidence)
   - Engagement growth rate (new contributions this week vs last week)
   - Prediction accuracy (how many predictions came true)
   - Viral content score (memes/posts with high engagement)

3. **Oracle calls smart contract** to update metrics

4. **Smart contract recalculates price**:
   ```
   new_price = base_price * (1 + growth_rate * multiplier)
   
   Growth rate includes:
   - Rating growth
   - Meme/post engagement
   - Prediction activity
   - Stake volume
   - Viral content impact
   ```

5. **Updated price feeds into marketplace**

**Why Walrus Matters for Pricing:**
- Can't fake historical data (it's on Walrus with signatures)
- Can verify ALL contributions independently
- Price reflects TOTAL community engagement (not just ratings!)
- Memes, posts, predictions, stakes - everything affects price
- Dynamic platform where all otakus can contribute in their own way

### The Data Market Architecture

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
│  - Post/meme upload             │
│  - Wallet connection            │
└──────┬──────────────────────────┘
       │
       │ 2. Sign engagement with wallet
       ▼
┌─────────────────────────────────┐
│         WALRUS STORAGE          │
│  - Stores engagement JSON       │
│  - Includes wallet signature    │
│  - Returns Content ID (CID)     │
│  - Immutable & timestamped      │
│                                 │
│  ALL contribution types:        │
│  - Ratings & reviews            │
│  - Memes & posts                │
│  - Episode predictions          │
│  - Price predictions            │
│  - Stakes                       │
│  - Shares & promotions          │
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
│  - Tracks viral content         │
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

### Key Benefits of Walrus Integration

**For Users:**
- Own your data with cryptographic proof
- Portable data that follows you, not the platform
- Verifiable early contributor status
- Immutable engagement history

**For the Platform:**
- Trustless system - don't need to trust platform
- Transparent - all engagement data is publicly verifiable
- Accurate pricing - token prices based on real, verified data
- Fair rewards - can't game the system with fake engagements

**For Token Holders:**
- Real value - token prices reflect genuine community engagement
- Data integrity - can verify metrics independently
- Price discovery - oracle-driven pricing based on real data

**The Goal:** Make ODX the biggest, most dynamic platform for all otakus! Every contribution matters:
- Your meme can go viral and boost the token price
- Your prediction can be accurate and earn rewards
- Your stake shows confidence and affects market sentiment
- Your post can spark discussions and increase engagement
- Your rating contributes to overall IP score

**Without Walrus, ODX would be just another centralized platform where the company owns user data. With Walrus, ODX becomes a true decentralized data market where users own their contributions (ALL types - not just ratings!) and token prices reflect genuine, comprehensive community engagement.**

---

## Architecture

### System Components

1. **Frontend** (Next.js + React + TypeScript)
   - Wallet connection (Sui wallet integration)
   - Engagement interface (ratings, predictions, posts, memes)
   - Marketplace UI (trading, charts, analytics)
   - Dashboard (token stats, leaderboards)

2. **Backend/Oracle Service** (Node.js + Express)
   - Reads Walrus data
   - Verifies wallet signatures
   - Aggregates engagement metrics
   - Calculates rewards
   - Updates smart contracts
   - Price feed aggregation

3. **Walrus Storage** (Decentralized Storage)
   - Stores ALL user contributions
   - Cryptographic proof of ownership
   - Immutable and timestamped
   - Queryable by IP token ID

4. **Smart Contracts** (Sui Move)
   - IP token creation and management
   - Marketplace trading
   - Reward distribution
   - Price calculation
   - Contributor tracking

5. **Indexing Service**
   - Indexes contributions by IP token ID
   - Enables fast queries
   - Tracks contribution history

### Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Sui Wallet Adapter

**Backend:**
- Node.js
- Express.js
- Walrus CLI integration
- Sui TypeScript SDK

**Blockchain:**
- Sui blockchain
- Move smart contracts

**Storage:**
- Walrus decentralized storage

---

## Key Features

### Data Ownership
- Fans own the data they create
- Proven by wallet signatures on Walrus
- Immutable and verifiable

### Attribution System
- Track who contributed what
- Reward early and high-value contributors
- Measure impact on popularity

### Trading & Speculation
- Buy/sell Data Tokens like stocks
- Perpetual futures for advanced trading
- Price reflects real engagement data

### Transparency
- All data stored on Walrus (decentralized)
- Public analytics and dashboards
- Verifiable engagement metrics

### Comprehensive Engagement
- Multiple contribution types (ratings, memes, posts, predictions, stakes)
- All contributions affect token price
- Dynamic platform for all otakus

---

## Project Structure

```
OX/
├── backend/                   # Backend API service
│   ├── src/
│   │   ├── server.js          # Express server setup
│   │   ├── routes/            # API routes
│   │   │   ├── posts.js       # Post/contribution endpoints
│   │   │   └── ...
│   │   ├── services/          # Business logic services
│   │   │   ├── walrus.js      # Walrus integration
│   │   │   ├── walrus-indexer.js  # Contribution indexing
│   │   │   ├── contract.js    # Smart contract interaction
│   │   │   ├── aggregation.js # Metrics aggregation
│   │   │   └── price-feed.js  # Price feed service
│   │   └── utils/             # Utilities
│   └── README.md
├── frontend/                  # Frontend application
│   ├── app/                   # Next.js app directory
│   ├── components/            # React components
│   └── lib/                   # Utilities and helpers
├── smartcontract/             # Sui smart contracts
│   └── odx/
│       ├── sources/           # Move source files
│       └── tests/             # Move tests
├── README.md                  # This file
├── project-concept.md         # Detailed project concept
├── WALRUS_INTEGRATION.md      # Walrus integration details
└── WALRUS_INTEGRATOR_GUIDE.md # Technical integration guide
```

---

## Getting Started

### Prerequisites

1. **Install pnpm**
   ```bash
   npm install -g pnpm
   ```

2. **Sui Wallet Setup**
   ```bash
   # Check if Sui CLI is installed
   sui --version
   
   # Switch to testnet
   sui client switch --env testnet
   
   # Check you have SUI tokens for gas
   sui client gas
   ```

3. **Walrus CLI Installation**
   ```bash
   # Install Walrus for testnet
   suiup install walrus@testnet
   
   # Verify installation
   ~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus --version
   ```

4. **WAL Tokens**
   - You need WAL tokens on testnet to pay for storage
   - Get testnet WAL from the Walrus faucet or testnet exchange

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd OX
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   pnpm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   pnpm install
   ```

4. **Set up environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

### Running the Project

**Backend:**
```bash
cd backend
pnpm run dev
```

**Frontend:**
```bash
cd frontend
pnpm run dev
```

For detailed setup instructions, see:
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)

---

## Documentation

### Core Documentation
- [Project Concept](project-concept.md) - Detailed project overview and design
- [Walrus Integration](WALRUS_INTEGRATION.md) - Why Walrus is critical
- [Walrus Integrator Guide](WALRUS_INTEGRATOR_GUIDE.md) - Technical integration guide

### Component Documentation
- [Backend API Documentation](backend/API_DOCS.md)
- [Frontend Design Guide](FRONTEND_DESIGN_GUIDE.md)
- [Smart Contract Documentation](smartcontract/odx/README.md)
- [Price Feed Aggregator](PRICE_FEED_AGGREGATOR.md)

### External Resources
- [Walrus Developer Guide](https://docs.wal.app/dev-guide/dev-guide.html)
- [Walrus Operations](https://docs.wal.app/dev-guide/dev-operations.html)
- [Sui TypeScript SDK](https://docs.sui.io/build/sui-typescript-sdk)
- [Walrus GitHub](https://github.com/MystenLabs/walrus)

---

## Vision

ODX transforms fan engagement into a **tradable, ownable asset**.

Fans don't just consume content — they **invest in the cultural value** of the series they love. Their engagement data becomes valuable, and they can profit from being early contributors or accurate predictors.

**In ODX, your fandom is not just passion — it's an asset.**

---

## License

MIT
