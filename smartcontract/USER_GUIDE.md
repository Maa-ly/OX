# ODX Smart Contracts - User Guide

## Welcome to ODX! 🎌

This guide will help you understand and use the ODX (Otaku Data Exchange) smart contracts. Whether you're a developer, trader, or contributor, this guide has everything you need.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Understanding ODX](#understanding-odx)
3. [User Flows](#user-flows)
4. [Developer Guide](#developer-guide)
5. [Common Operations](#common-operations)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### What is ODX?

ODX is a **data market for anime, manga, and manhwa fandom**. Think of it like a stock market, but instead of trading company shares, you trade tokens that represent the engagement and popularity of your favorite IPs (Intellectual Properties).

### Key Concepts

- **IP Token**: A token representing an anime/manga/manhwa (e.g., "Chainsaw Man" token)
- **Engagement/Contribution**: ALL your interactions that help promote the IP:
  - Ratings and reviews
  - Memes and fun posts
  - Episode release predictions
  - Token price predictions (dips/rises)
  - Staking on predictions
  - Social media shares
  - Community discussions
  - Any content that pushes the anime/manga!
- **Contributor**: Someone who creates content or engages with IPs and gets rewarded
- **Marketplace**: Where you buy and sell IP tokens
- **Rewards**: Tokens you earn for contributing early, accurately, or creating viral content
- **Dynamic Platform**: A vibrant community where all otakus can contribute in their own way

---

## Understanding ODX

### The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                    ODX Ecosystem                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │   Fans   │─────▶│  Walrus  │─────▶│  Oracle  │         │
│  │ Engage   │      │  Storage │      │  Service │         │
│  └──────────┘      └──────────┘      └────┬─────┘         │
│       │                                    │                │
│       │                                    ▼                │
│       │                            ┌──────────────┐        │
│       │                            │   Sui Smart  │        │
│       └───────────────────────────▶│  Contracts   │        │
│                                    └──────┬───────┘        │
│                                           │                 │
│                                    ┌──────▼───────┐        │
│                                    │  Marketplace │        │
│                                    │  & Rewards   │        │
│                                    └──────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### How It Works (Simple Version)

1. **You contribute** in ANY way that helps the IP:
   - Create memes, posts, reviews
   - Make predictions (episodes, token prices)
   - Rate and review content
   - Share and promote
   - Stake on predictions
2. **Your contribution** is stored on Walrus (you own it!)
3. **Oracle** reads all contributions and calculates metrics
4. **Token price** updates based on ALL contributions (memes, posts, predictions, etc.)
5. **You get rewarded** for early, accurate, or viral contributions
6. **You can trade** tokens on the marketplace
7. **Platform grows** as more otakus contribute in diverse ways!

---

## User Flows

### Flow 1: Contributing to an IP (Multiple Ways!)

```
┌─────────┐
│  User   │
│ (Otaku) │
└────┬────┘
     │
     │ 1. Connect Wallet
     ▼
┌─────────────────┐
│  ODX Platform   │
│  - Browse IPs   │
│  - Select IP    │
└────┬────────────┘
     │
     │ 2. Choose Contribution Type:
     │    ┌─────────────────────────┐
     │    │ • Rate/Review (1-10)    │
     │    │ • Post Meme             │
     │    │ • Create Fun Post       │
     │    │ • Predict Episode Date  │
     │    │ • Predict Token Price   │
     │    │ • Stake on Prediction   │
     │    │ • Share Content         │
     │    └─────────────────────────┘
     ▼
┌─────────────────┐
│  Sign with      │
│  Wallet         │
└────┬────────────┘
     │
     │ 3. Contribution + Signature
     ▼
┌─────────────────┐
│  Walrus Storage │
│  - Stores ALL   │
│    contributions│
│  - Returns CID  │
└────┬────────────┘
     │
     │ 4. CID sent to contract
     ▼
┌─────────────────┐
│  Smart Contract │
│  register_      │
│  engagement()   │
└────┬────────────┘
     │
     │ 5. Contributor record created
     │    ALL contributions tracked!
     ▼
┌─────────────────┐
│  Success!       │
│  You're now a   │
│  contributor!   │
│  Your meme/post │
│  affects price! │
└─────────────────┘
```

**What Happens:**
- **ALL your contributions** are stored on Walrus with your wallet signature:
  - Ratings and reviews
  - Memes and fun posts
  - Episode predictions
  - Token price predictions
  - Stakes on predictions
  - Shares and promotions
- A contributor record is created/updated for you
- If you're among the first 100 contributors, you get "early contributor" status
- **ALL contributions affect the token price** - memes, posts, predictions, everything!
- Your engagement is tracked for future rewards

---

### Flow 2: Early Contributor Getting Rewarded

```
┌─────────┐
│  User   │
│  (Early │
│  Contributor)│
└────┬────┘
     │
     │ 1. Made early engagement
     │    (Within first 100)
     ▼
┌─────────────────┐
│  Oracle Service │
│  - Aggregates   │
│  - Calculates   │
│  - Updates      │
└────┬────────────┘
     │
     │ 2. Reward calculation triggered
     ▼
┌─────────────────┐
│  Smart Contract │
│  calculate_     │
│  reward()       │
│                 │
│  Base: 100      │
│  Early: x2      │
│  = 200 tokens   │
└────┬────────────┘
     │
     │ 3. Release from reserve pool
     ▼
┌─────────────────┐
│  Smart Contract │
│  distribute_    │
│  reward()       │
│                 │
│  Releases 200   │
│  tokens from    │
│  IP reserve     │
└────┬────────────┘
     │
     │ 4. Tokens added to your balance
     ▼
┌─────────────────┐
│  Success!       │
│  You received   │
│  200 tokens!    │
└─────────────────┘
```

**Reward Multipliers:**
- **Early Contributor** (first 100): 2x multiplier
- **Prediction Accuracy** (>70%): 1.5x multiplier
- **Viral Content** (1000+ engagements): 3x multiplier

**Example Calculation:**
```
Base Reward: 100 tokens
Early Contributor: 100 × 2 = 200 tokens
Prediction Accuracy: 200 × 1.5 = 300 tokens
Viral Content: 300 × 3 = 900 tokens
```

---

### Flow 3: Buying IP Tokens

```
┌─────────┐
│  Buyer  │
└────┬────┘
     │
     │ 1. Browse marketplace
     │    See "Chainsaw Man" token
     │    Current price: 0.5 SUI
     ▼
┌─────────────────┐
│  ODX Frontend   │
│  - View price   │
│  - Check chart  │
│  - Place order  │
└────┬────────────┘
     │
     │ 2. Create buy order
     │    Quantity: 100 tokens
     │    Price: 0.5 SUI each
     │    Payment: 50 SUI + fee
     ▼
┌─────────────────┐
│  Smart Contract │
│  create_buy_    │
│  order()        │
│                 │
│  - Validates    │
│  - Creates order│
│  - Holds payment│
└────┬────────────┘
     │
     │ 3. Order matched with seller
     ▼
┌─────────────────┐
│  Smart Contract │
│  execute_buy_   │
│  order()        │
│                 │
│  - Matches order│
│  - Transfers    │
│  - Updates      │
└────┬────────────┘
     │
     │ 4. You receive tokens
     ▼
┌─────────────────┐
│  Success!       │
│  You own 100    │
│  CSM tokens!    │
└─────────────────┘
```

**Trading Fees:**
- Default: 1% of trade value
- Fee is deducted from your payment
- Remaining payment is returned to you

---

### Flow 4: Price Updates Based on ALL Contributions

```
┌─────────┐
│  Otakus │
│ Contribute│
└────┬────┘
     │
     │ 1. Multiple users contribute:
     │    • Memes go viral
     │    • Posts get shared
     │    • Predictions made
     │    • Stakes placed
     │    • Ratings submitted
     │    "One Piece" trending up!
     ▼
┌─────────────────┐
│  Walrus Storage │
│  - ALL types of │
│    contributions│
│  - Memes, posts │
│  - Predictions  │
│  - Ratings      │
│  - Stakes       │
└────┬────────────┘
     │
     │ 2. Oracle queries Walrus
     │    Aggregates EVERYTHING
     ▼
┌─────────────────┐
│  Oracle Service │
│                 │
│  Calculates:    │
│  - Avg rating: 8.5│
│  - Contributors: 500│
│  - Memes: 200   │
│  - Posts: 150   │
│  - Predictions: 100│
│  - Stakes: 50   │
│  - Growth: +25% │
│  - Viral content│
│  - Accuracy: 75%│
└────┬────────────┘
     │
     │ 3. Updates on-chain metrics
     │    ALL contributions counted!
     ▼
┌─────────────────┐
│  Smart Contract │
│  update_        │
│  engagement_    │
│  metrics()      │
└────┬────────────┘
     │
     │ 4. Triggers price recalculation
     │    Price reflects ALL activity
     ▼
┌─────────────────┐
│  Smart Contract │
│  recalculate_   │
│  price()        │
│                 │
│  Formula:       │
│  price = base × │
│  (1 + growth)   │
│                 │
│  Growth includes:│
│  - All memes    │
│  - All posts    │
│  - All predictions│
│  - All stakes   │
│  - All ratings  │
└────┬────────────┘
     │
     │ 5. Price updates
     │    Reflects TOTAL community
     │    engagement!
     ▼
┌─────────────────┐
│  New Price:     │
│  0.5 SUI →      │
│  0.625 SUI      │
│  (+25%)         │
│                 │
│  Your meme/post │
│  helped! 🚀     │
└─────────────────┘
```

**Price Formula:**
```
New Price = Base Price × (1 + Growth Rate × Multiplier)
```

**Growth Rate Includes:**
- **All Ratings**: Average rating across all users
- **All Memes**: Viral memes boost engagement
- **All Posts**: Fun posts and discussions
- **All Predictions**: Episode dates, token prices
- **All Stakes**: People betting on predictions
- **All Shares**: Social media promotion
- **Total Contributors**: More people = more growth

**Example:**
- Base Price: 0.5 SUI
- Growth Rate: 25% (0.25) - includes memes, posts, predictions, stakes, ratings
- Multiplier: 1.0
- New Price: 0.5 × (1 + 0.25) = 0.625 SUI

**Key Point:** Your meme, post, or prediction directly affects the token price! The more viral your content, the more it impacts the price.

---

### Flow 5: Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    Complete User Journey                    │
└─────────────────────────────────────────────────────────────┘

Step 1: Onboarding
┌─────────┐
│  New    │
│  User   │
└────┬────┘
     │
     │ • Connect wallet
     │ • Browse available IPs
     │ • Read about ODX
     ▼
┌─────────┐
│ Ready to│
│ Engage  │
└────┬────┘

Step 2: First Contribution
     │
     │ • Post a meme about "Solo Leveling"
     │ • Rate it 10/10
     │ • Predict: "Will trend #1"
     │ • Predict: "Episode 100 releases Dec 20"
     │ • Stake tokens on predictions
     │ • ALL stored on Walrus
     │ • ALL affect token price!
     ▼
┌─────────┐
│ Early   │
│ Contributor│
│ Status! │
└────┬────┘

Step 3: Earning Rewards
     │
     │ • Oracle aggregates data
     │ • Reward calculated: 200 tokens
     │ • Tokens released from reserve
     ▼
┌─────────┐
│ 200     │
│ Tokens  │
│ Earned! │
└────┬────┘

Step 4: Active Community Member
     │
     │ • Keep posting memes and content
     │ • Make more predictions
     │ • Stake on others' predictions
     │ • Price increases due to ALL contributions
     │ • Sell 100 tokens for profit
     │ • Buy other IP tokens
     │ • Help build dynamic platform!
     ▼
┌─────────┐
│ Active  │
│ Trader  │
└─────────┘
```

---

## Developer Guide

### Smart Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Smart Contract Modules                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                           │
│  │  datatypes   │  ← Shared data structures                 │
│  │   .move      │     (IPToken, EngagementData, etc.)       │
│  └──────┬───────┘                                           │
│         │                                                    │
│    ┌────┴────┬──────────┬──────────┬──────────┐            │
│    │         │          │          │          │            │
│ ┌──▼──┐  ┌──▼──┐   ┌───▼───┐  ┌──▼──┐   ┌───▼───┐        │
│ │token│  │market│   │rewards│  │oracle│   │  odx  │        │
│ │.move│  │place │   │ .move │  │.move │   │ .move │        │
│ └─────┘  │.move │   └───────┘  └──────┘   └───────┘        │
│          └──────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

**datatypes.move**
- Defines all shared structures
- Provides getter/setter functions
- Contains constants and enums

**token.move**
- IP token creation
- Supply management
- Reserve pool operations

**marketplace.move**
- Order creation (buy/sell)
- Order execution
- Trading fee management

**rewards.move**
- Contributor tracking
- Reward calculation
- Token distribution

**oracle.move**
- Engagement metrics updates
- Price calculation
- Data synchronization

### Key Functions Reference

#### Token Management
```move
// Create a new IP token (Admin only)
public fun create_ip_token(
    admin_cap: &AdminCap,
    registry: &mut TokenRegistry,
    name: vector<u8>,
    symbol: vector<u8>,
    description: vector<u8>,
    category: u8,
    reserve_pool_size: u64,
    ctx: &mut TxContext
): IPToken

// Get token information
public fun get_token_info(token: &IPToken): (vector<u8>, vector<u8>, u64, u64, u64)
```

#### Marketplace
```move
// Create buy order
public fun create_buy_order(
    marketplace: &mut Marketplace,
    ip_token_id: ID,
    price: u64,
    quantity: u64,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext
): (MarketOrder, Coin<SUI>)

// Create sell order
public fun create_sell_order(
    marketplace: &mut Marketplace,
    ip_token_id: ID,
    price: u64,
    quantity: u64,
    ctx: &mut TxContext
): MarketOrder
```

#### Rewards
```move
// Register engagement
public fun register_engagement(
    registry: &mut RewardsRegistry,
    engagement: EngagementData,
    ip_token: &IPToken,
    ctx: &mut TxContext
)

// Distribute reward
public fun distribute_reward(
    registry: &mut RewardsRegistry,
    config: &RewardConfig,
    ip_token: &mut IPToken,
    user_address: address,
    reason: u8,
    ctx: &mut TxContext
): u64
```

#### Oracle
```move
// Update engagement metrics
public fun update_engagement_metrics(
    oracle: &mut PriceOracle,
    admin_cap: &OracleAdminCap,
    ip_token_id: ID,
    average_rating: u64,
    total_contributors: u64,
    total_engagements: u64,
    prediction_accuracy: u64,
    growth_rate: u64,
    ctx: &mut TxContext
)

// Get current price
public fun get_price(oracle: &PriceOracle, ip_token_id: ID): Option<u64>
```

---

## Common Operations

### For Regular Users

#### 1. Rate an IP
```
1. Connect wallet to ODX frontend
2. Browse and select an IP (e.g., "Chainsaw Man")
3. Click "Rate" and select rating (1-10)
4. Sign transaction with wallet
5. Your rating is stored on Walrus
6. Contributor record created/updated
7. Rating affects token price!
```

#### 2. Post a Meme or Fun Content
```
1. Select an IP you love
2. Click "Create Post" or "Post Meme"
3. Upload your meme/image or write fun content
4. Add caption/tags
5. Sign transaction with wallet
6. Your post is stored on Walrus
7. If it goes viral, it boosts token price!
8. You get rewarded for viral content
```

#### 3. Make Episode Release Predictions
```
1. Select an IP (e.g., "One Piece")
2. Click "Predict Episode"
3. Enter prediction: "Episode 1100 releases on Dec 15"
4. Optionally stake tokens on your prediction
5. Sign transaction
6. Prediction stored on Walrus
7. If accurate, you get bonus rewards!
8. Your prediction affects token price
```

#### 4. Predict Token Price Movements
```
1. Go to marketplace
2. Select IP token (e.g., "Chainsaw Man" token)
3. Click "Predict Price"
4. Enter prediction: "Will dip 20% this week" or "Will rise 30%"
5. Stake tokens on your prediction
6. Sign transaction
7. Prediction stored on Walrus
8. If accurate, you win staked tokens + rewards!
9. Your prediction affects market sentiment
```

#### 5. Stake on Predictions
```
1. Browse predictions made by others
2. Find one you agree with
3. Click "Stake on This"
4. Enter amount of tokens to stake
5. Sign transaction
6. Stake stored on Walrus
7. If prediction is correct, you share in rewards!
8. Stakes show community confidence (affects price)
```

#### 3. Buy IP Tokens
```
1. Go to Marketplace
2. Select IP token to buy
3. Enter quantity and price
4. Approve payment
5. Order created and matched
6. Tokens added to your wallet
```

#### 4. Sell IP Tokens
```
1. Go to Marketplace
2. Select tokens you own
3. Create sell order
4. Set price and quantity
5. Order matched with buyer
6. SUI received in wallet
```

### For Developers

#### 1. Deploy Contracts
```bash
cd smartcontract/odx
sui move build
sui client publish --gas-budget 10000000
```

#### 2. Initialize Modules
```bash
# Initialize token module
sui client call --package <PACKAGE_ID> \
  --module token \
  --function init \
  --gas-budget 10000000

# Initialize marketplace
sui client call --package <PACKAGE_ID> \
  --module marketplace \
  --function init \
  --gas-budget 10000000
```

#### 3. Create IP Token (Admin)
```bash
sui client call --package <PACKAGE_ID> \
  --module token \
  --function create_ip_token \
  --args <ADMIN_CAP> <REGISTRY> "Chainsaw Man" "CSM" "Description" 0 50000 \
  --gas-budget 10000000
```

---

## Troubleshooting

### Common Issues

#### "Insufficient balance"
**Problem:** Not enough SUI for transaction or payment

**Solution:**
- Check your SUI balance: `sui client gas`
- Get testnet SUI from faucet: https://faucet.sui.io

#### "Order not found"
**Problem:** Trying to execute an order that doesn't exist

**Solution:**
- Verify order ID is correct
- Check order status (might be already filled/cancelled)

#### "Not authorized"
**Problem:** Trying to perform admin-only operation

**Solution:**
- Only admin can create tokens
- Regular users can only create orders and engage

#### "Reserve pool insufficient"
**Problem:** Trying to distribute more rewards than available

**Solution:**
- Check reserve pool balance
- Reduce reward amount
- Admin can adjust reserve pool size

### Getting Help

- Check the [README.md](./odx/README.md) for technical details
- Review [WALRUS_INTEGRATION.md](../WALRUS_INTEGRATION.md) for data storage info
- Check Sui documentation: https://docs.sui.io
- Join ODX community (when available)

---

## Best Practices

### For Users

1. **Contribute Early**: First 100 contributors get 2x rewards
2. **Create Viral Content**: Memes and fun posts that go viral earn 3x rewards
3. **Be Accurate**: Accurate predictions (episodes, prices) earn 1.5x rewards
4. **Stake Wisely**: Staking on correct predictions multiplies your rewards
5. **Stay Active**: Regular contributions increase your contributor score
6. **Diversify**: Contribute to multiple IPs to spread risk
7. **Research**: Check engagement metrics before trading
8. **Have Fun**: The platform is for otakus - memes, posts, and fun content are all valuable!
9. **Predict Everything**: Episode releases, token prices, trends - all predictions matter
10. **Build Community**: Your contributions help build a dynamic, huge platform for all otakus

### For Developers

1. **Test First**: Always test on testnet before mainnet
2. **Handle Errors**: Implement proper error handling
3. **Gas Optimization**: Be mindful of gas costs
4. **Security**: Review all user inputs
5. **Documentation**: Comment your code

---

## Glossary

- **IP Token**: Token representing an anime/manga/manhwa
- **Engagement**: User interaction (rating, prediction, vote, review)
- **Contributor**: User who engages with IPs
- **Reserve Pool**: Tokens set aside for rewards
- **Oracle**: Service that reads Walrus data and updates on-chain
- **CID**: Content ID on Walrus (unique identifier for stored data)
- **Early Contributor**: One of the first 100 contributors to an IP
- **Growth Rate**: Percentage increase in engagement over time
- **Order Book**: List of buy and sell orders
- **Trading Fee**: Percentage charged on each trade (default 1%)

---

## Next Steps

1. **Explore**: Browse available IP tokens
2. **Engage**: Rate your favorite anime/manga
3. **Earn**: Get rewarded for early engagement
4. **Trade**: Buy and sell tokens on marketplace
5. **Build**: Integrate ODX into your application

---

**Happy Trading! 🚀**

For technical documentation, see [README.md](./odx/README.md)

