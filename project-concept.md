# ODX - Otaku Data Exchange
## Data Market for Anime, Manga & Manhwa Fandom

### Core Concept

**The Data Market = Stock Market for Fandom Engagement Data**

Think of ODX as a stock market, but instead of trading company shares, users trade tokens that represent the engagement and popularity of anime, manga, and manhwa IPs.

- **Data is the commodity** being bought and sold
- **Fans own the data** they generate (stored on Walrus)
- **Contributors are tracked and rewarded** for making content popular
- **Tokens represent aggregated engagement value** for each IP

---

## How It Works

### 1. Token Creation & Supply

- **Admin Role**: Admin creates tokens for 1000 different IPs (Chainsaw Man, One Piece, Solo Leveling, etc.)
- **Fixed Supply**: Each IP token has a limited supply of 200k tokens
- **Initial Distribution**: 
  - Portion held by admin/platform
  - Reserve pool for contributor rewards
  - Initial distribution mechanism (TBD: ICO, airdrop, or gradual release)

### 2. Fan Engagement & Data Ownership

Fans interact with the platform by:
- Rating anime/manga titles
- Making predictions about popularity trends
- Voting on content
- Leaving reviews/comments

**Each engagement is:**
- Stored on Walrus (decentralized storage)
- Tied to user's wallet (proven ownership)
- Timestamped and immutable

**Example Walrus Data:**
```json
{
  "ip": "Solo Leveling",
  "rating": 9,
  "prediction": "Top 3 next week",
  "user_wallet": "0xA23...9bE",
  "timestamp": 1736629200
}
```

### 3. Data Aggregation & Token Value

All fan submissions for a particular IP are aggregated to form a **Data Profile**.

**Data Token represents:**
- Average ratings
- Number of contributors
- Prediction accuracy scores
- Engagement growth rate
- Social signals (popularity, following, mentions)

**Token metrics feed into price calculation:**
- Engagement data from Walrus → Oracle → Token Price
- Market demand also influences price
- Price increases as engagement/popularity grows

### 4. Attribution & Rewards

**Tracking "Who Made What Popular":**

The platform tracks and rewards contributors based on:
- **Early Engagement**: First contributors to an IP get bonus tokens
- **Prediction Accuracy**: Correct predictions earn more rewards
- **Viral Contributions**: Content that drives engagement gets rewarded
- **Network Effects**: Users who bring others to engage get a share

**Reward Distribution:**
- Tokens from reserve pool distributed to contributors
- Proportional to contribution value and timing
- Regular distribution cycles (real-time, daily, or weekly - TBD)

### 5. Marketplace Trading

**Trading Mechanisms:**
- **Spot Trading**: Buy/sell Data Tokens on marketplace
  - Order book model (traditional buy/sell orders)
  - Or AMM model (liquidity pools)
  - Or hybrid approach
- **Perpetual Futures**: Futures trading on Data Tokens
  - Requires price feed (from oracle or market)
  - Collateral system
  - Funding rates

**Price Discovery:**
- Oracle model: Walrus data feeds into price formula
- Market-driven: Supply/demand from trades
- Hybrid: Oracle sets base price, market adds premium

### 6. Price Mechanics

**How Engagement Drives Token Price:**

Token price increases with:
- Higher engagement metrics (ratings, votes, predictions)
- Growing popularity (followers, mentions, social signals)
- Accurate predictions (community trust)
- Network growth (more contributors)

**Price Formula (Conceptual):**
```
price = base_price * (1 + engagement_growth_rate * multiplier)
```

**Key Metrics:**
- Number of unique contributors
- Average rating
- Prediction accuracy
- Growth rate (new engagement over time)
- Social signals (external popularity data)

---

## Example User Flow

1. **Admin creates $CSM token** for Chainsaw Man (200k supply, 50k reserved for rewards)

2. **Lydia engages early:**
   - Rates Chainsaw Man 10/10
   - Predicts "Will trend top 3 next week"
   - Data stored on Walrus with her wallet signature

3. **Aggregation engine:**
   - Reads Walrus data
   - Calculates engagement metrics for Chainsaw Man
   - Updates $CSM token profile

4. **Reward system:**
   - Lydia receives $CSM tokens from reserve pool
   - Rewards based on early participation and prediction accuracy

5. **Price oracle:**
   - Walrus data → engagement score → token price formula
   - $CSM price updates based on aggregated engagement

6. **Marketplace:**
   - Traders buy $CSM tokens expecting price to rise
   - If engagement spikes (new season, viral content), price rises
   - Early contributors like Lydia can sell for profit

7. **Perpetuals:**
   - Users can trade futures on $CSM token price
   - Speculate on future engagement trends

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

---

## Technical Architecture

### Components

1. **Smart Contracts**
   - ERC-20 or ERC-1155 tokens (TBD)
   - Marketplace contracts
   - Reward distribution contracts
   - Perpetuals contracts (or integration with existing protocol)

2. **Walrus Integration**
   - Store individual engagement data
   - Prove ownership via wallet signatures
   - Queryable for aggregation

3. **Oracle System**
   - Pull data from Walrus
   - Calculate engagement metrics
   - Update token prices
   - Feed price data to marketplace and perps

4. **Frontend**
   - Wallet connection (Wagmi/RainbowKit)
   - Engagement interface (ratings, predictions, votes)
   - Marketplace UI (trading, charts, analytics)
   - Dashboard (token stats, leaderboards)

5. **Backend/Aggregation Engine**
   - Read Walrus data
   - Aggregate engagement metrics
   - Calculate rewards
   - Update oracle prices

---

## Open Questions & Design Decisions

### Token Economics
- [ ] ERC-20 vs ERC-1155 for tokens?
- [ ] Exact initial distribution mechanism?
- [ ] Reserve pool size (how much for rewards)?
- [ ] Reward distribution frequency (real-time, daily, weekly)?

### Price Mechanics
- [ ] Exact price formula based on engagement metrics?
- [ ] Which metrics matter most for price?
- [ ] How often to update prices (real-time, hourly, daily)?
- [ ] Oracle vs market-driven vs hybrid pricing?

### Marketplace Design
- [ ] Order book vs AMM vs bonding curve?
- [ ] Trading fees structure?
- [ ] Liquidity provision mechanism?

### Perpetuals
- [ ] Build custom or integrate with existing protocol (GMX, Synthetix)?
- [ ] Collateral requirements?
- [ ] Funding rate calculation?

### Attribution & Rewards
- [ ] How to measure "making something popular" vs just participating?
- [ ] Reward calculation algorithm?
- [ ] Anti-gaming mechanisms (prevent spam/farming)?

### Walrus Integration
- [ ] What exact data structure to store?
- [ ] How to efficiently query/aggregate?
- [ ] Data update frequency?

---

## Vision

ODX transforms fan engagement into a **tradable, ownable asset**.

Fans don't just consume content — they **invest in the cultural value** of the series they love. Their engagement data becomes valuable, and they can profit from being early contributors or accurate predictors.

**In ODX, your fandom is not just passion — it's an asset.**




