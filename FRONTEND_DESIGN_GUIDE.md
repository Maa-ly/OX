# ODX Frontend Design Guide - Complete System Flow

## Overview

This document provides a comprehensive guide to how the ODX platform works from user interaction to smart contract execution. Use this to design the frontend UI/UX in Figma.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [User Flows - All Contribution Types](#user-flows---all-contribution-types)
3. [Backend Processing](#backend-processing)
4. [Smart Contract Interactions](#smart-contract-interactions)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [UI/UX Requirements](#uiux-requirements)
7. [Screen-by-Screen Breakdown](#screen-by-screen-breakdown)
8. [State Management](#state-management)
9. [API Integration Points](#api-integration-points)

---

## Platform Overview

### What is ODX?

ODX (Otaku Data Exchange) is a decentralized platform where users can:
- Rate anime, manga, and manhwa
- Post memes and content
- Make predictions (episode releases, token prices)
- Stake tokens on predictions
- Trade IP tokens (representing anime/manga IPs)
- Earn rewards for contributions

### Key Concepts

**IP Tokens:** ERC-20/ERC-1155 like tokens representing anime/manga/manhwa intellectual property. Each IP has its own token.

**Contributions:** Any user engagement that affects token price:
- Ratings (1-10 scale)
- Memes (images/videos)
- Posts (text content)
- Episode predictions
- Price predictions
- Stakes on predictions

**Token Price:** Dynamically calculated based on ALL contributions (not just ratings). Memes, posts, predictions, and stakes all affect price.

**Rewards:** Users earn tokens for:
- Early contributions
- Accurate predictions
- Viral content
- Consistent engagement

---

## User Flows - All Contribution Types

### Flow 1: User Rates an IP

**Step-by-Step:**

1. **User lands on IP page** (e.g., "Chainsaw Man")
   - Sees current token price
   - Sees average rating
   - Sees contribution stats

2. **User clicks "Rate" button**
   - Modal/drawer opens
   - Rating slider (1-10) or star selector
   - Optional review text field
   - "Submit Rating" button

3. **User selects rating (e.g., 9/10)**
   - UI shows selected rating
   - User can add review text
   - User clicks "Submit Rating"

4. **Frontend creates contribution object:**
   ```json
   {
     "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
     "engagement_type": "rating",
     "rating": 9,
     "review_text": "Amazing anime!",
     "user_wallet": "0x6df...",
     "timestamp": 1736629200
   }
   ```

5. **Frontend requests wallet signature:**
   - Wallet popup appears
   - User signs the contribution data
   - Signature added to contribution object

6. **Frontend sends to backend:**
   ```javascript
   POST /api/oracle/contributions
   {
     ...contribution,
     "signature": "0xabc123..."
   }
   ```

7. **Backend processes:**
   - Stores on Walrus → Returns blob ID
   - Indexes contribution
   - Returns success response

8. **Frontend updates UI:**
   - Shows "Rating submitted!" message
   - Updates rating display
   - Shows pending status (waiting for price update)

9. **Oracle service (background):**
   - Queries contributions
   - Verifies signature
   - Aggregates metrics
   - Updates smart contract
   - Token price recalculates

10. **Frontend polls/updates:**
    - Shows updated token price
    - Shows updated average rating
    - Shows user's contribution in history

**UI Elements Needed:**
- IP page with rating section
- Rating modal/drawer
- Rating input (slider/stars)
- Review text field
- Wallet connection button
- Signature request modal
- Success message
- Loading states
- Price display
- Rating history

---

### Flow 2: User Posts a Meme

**Step-by-Step:**

1. **User lands on IP page** (e.g., "One Piece")
   - Sees meme section/feed
   - Sees "Post Meme" button

2. **User clicks "Post Meme"**
   - Modal/drawer opens
   - Image upload area
   - Caption text field
   - Tags input
   - "Post Meme" button

3. **User uploads image**
   - Image preview shown
   - User adds caption: "When Luffy finally becomes Pirate King"
   - User adds tags: ["funny", "one-piece"]
   - User clicks "Post Meme"

4. **Frontend uploads image to Walrus:**
   - Shows upload progress
   - Gets content CID: "bafybeigdyrzt5sfp7..."

5. **Frontend creates contribution object:**
   ```json
   {
     "ip_token_id": "0x123...",
     "engagement_type": "meme",
     "content_cid": "bafybeigdyrzt5sfp7...",
     "caption": "When Luffy finally becomes Pirate King",
     "tags": ["funny", "one-piece"],
     "user_wallet": "0x6df...",
     "timestamp": 1736629200
   }
   ```

6. **Frontend requests wallet signature:**
   - Wallet popup appears
   - User signs the contribution data
   - Signature added

7. **Frontend sends to backend:**
   ```javascript
   POST /api/oracle/contributions
   {
     ...contribution,
     "signature": "0xdef456..."
   }
   ```

8. **Backend processes:**
   - Stores on Walrus → Returns blob ID
   - Indexes contribution
   - Returns success response

9. **Frontend updates UI:**
   - Shows "Meme posted!" message
   - Adds meme to feed
   - Shows pending status

10. **Oracle service (background):**
    - Queries contributions
    - Verifies signature
    - Aggregates metrics (viral content score)
    - Updates smart contract
    - Token price recalculates (memes affect price!)

11. **Frontend updates:**
    - Shows updated token price
    - Shows meme engagement (likes, shares)
    - Shows if meme goes viral

**UI Elements Needed:**
- Meme feed section
- "Post Meme" button
- Meme upload modal
- Image upload area with preview
- Caption text field
- Tags input
- Upload progress indicator
- Meme card component
- Engagement buttons (like, share, comment)
- Viral badge/indicator

---

### Flow 3: User Makes Episode Prediction

**Step-by-Step:**

1. **User lands on IP page** (e.g., "Solo Leveling")
   - Sees predictions section
   - Sees "Make Prediction" button

2. **User clicks "Make Prediction"**
   - Modal/drawer opens
   - Prediction type selector: "Episode Release"
   - Episode number input
   - Date picker
   - Optional stake amount input
   - "Submit Prediction" button

3. **User fills prediction:**
   - Episode: 12
   - Date: Dec 25, 2024
   - Optional stake: 100 tokens
   - User clicks "Submit Prediction"

4. **Frontend creates contribution object:**
   ```json
   {
     "ip_token_id": "0x123...",
     "engagement_type": "episode_prediction",
     "prediction": "Episode 12 releases on Dec 25, 2024",
     "predicted_date": 1735084800,
     "episode_number": 12,
     "stake_amount": 100,
     "user_wallet": "0x6df...",
     "timestamp": 1736629200
   }
   ```

5. **Frontend requests wallet signature:**
   - Wallet popup appears
   - User signs the contribution data
   - Signature added

6. **Frontend sends to backend:**
   ```javascript
   POST /api/oracle/contributions
   {
     ...contribution,
     "signature": "0xghi789..."
   }
   ```

7. **Backend processes:**
   - Stores on Walrus → Returns blob ID
   - Indexes contribution
   - Returns success response

8. **Frontend updates UI:**
   - Shows "Prediction submitted!" message
   - Adds prediction to predictions list
   - Shows stake amount (if staked)
   - Shows pending status

9. **Oracle service (background):**
    - Queries contributions
    - Verifies signature
    - Aggregates metrics (prediction count)
    - Updates smart contract
    - Token price recalculates

10. **When episode releases:**
    - System checks if prediction was accurate
    - If accurate: User gets rewards + stake back
    - If inaccurate: Stake may be lost (depending on rules)
    - Frontend shows prediction outcome
    - User sees rewards earned

**UI Elements Needed:**
- Predictions section
- "Make Prediction" button
- Prediction modal
- Prediction type selector
- Episode number input
- Date picker
- Stake amount input
- Prediction card component
- Prediction status (pending, accurate, inaccurate)
- Rewards display
- Prediction leaderboard

---

### Flow 4: User Makes Price Prediction

**Step-by-Step:**

1. **User lands on IP page** (e.g., "Chainsaw Man")
   - Sees price prediction section
   - Sees current token price
   - Sees "Predict Price" button

2. **User clicks "Predict Price"**
   - Modal/drawer opens
   - Prediction type: "Rise" or "Dip"
   - Percentage input (e.g., 30%)
   - Timeframe selector (e.g., "This week")
   - Stake amount input
   - "Submit Prediction" button

3. **User fills prediction:**
   - Type: "Rise"
   - Percentage: 30%
   - Timeframe: "1 week"
   - Stake: 500 tokens
   - User clicks "Submit Prediction"

4. **Frontend creates contribution object:**
   ```json
   {
     "ip_token_id": "0x123...",
     "engagement_type": "price_prediction",
     "prediction": "Will rise 30% this week",
     "prediction_type": "rise",
     "predicted_percentage": 30,
     "timeframe": "1_week",
     "stake_amount": 500,
     "user_wallet": "0x6df...",
     "timestamp": 1736629200
   }
   ```

5. **Frontend requests wallet signature:**
   - Wallet popup appears
   - User signs the contribution data
   - Signature added

6. **Frontend sends to backend:**
   ```javascript
   POST /api/oracle/contributions
   {
     ...contribution,
     "signature": "0xjkl012..."
   }
   ```

7. **Backend processes:**
   - Stores on Walrus → Returns blob ID
   - Indexes contribution
   - Returns success response

8. **Frontend updates UI:**
   - Shows "Prediction submitted!" message
   - Adds prediction to predictions list
   - Shows stake amount
   - Shows countdown timer
   - Shows pending status

9. **Oracle service (background):**
    - Queries contributions
    - Verifies signature
    - Aggregates metrics (prediction count, stake volume)
    - Updates smart contract
    - Token price recalculates (predictions affect sentiment!)

10. **After timeframe:**
    - System checks actual price movement
    - If accurate: User gets rewards + stake back
    - If inaccurate: Stake may be lost
    - Frontend shows prediction outcome
    - User sees rewards earned

**UI Elements Needed:**
- Price prediction section
- "Predict Price" button
- Price prediction modal
- Prediction type toggle (Rise/Dip)
- Percentage input
- Timeframe selector
- Stake amount input
- Current price display
- Price chart
- Prediction card component
- Countdown timer
- Prediction outcome display
- Rewards display

---

### Flow 5: User Stakes on Prediction

**Step-by-Step:**

1. **User sees a prediction** (from another user or themselves)
   - Sees prediction details
   - Sees "Stake on This" button
   - Sees current stake amount

2. **User clicks "Stake on This"**
   - Modal/drawer opens
   - Stake amount input
   - Shows prediction details
   - "Submit Stake" button

3. **User enters stake amount:**
   - Amount: 200 tokens
   - User clicks "Submit Stake"

4. **Frontend creates contribution object:**
   ```json
   {
     "prediction_cid": "bafybeigdyrzt5sfp7...",
     "engagement_type": "stake",
     "stake_amount": 200,
     "user_wallet": "0x6df...",
     "timestamp": 1736629200
   }
   ```

5. **Frontend requests wallet signature:**
   - Wallet popup appears
   - User signs the contribution data
   - Signature added

6. **Frontend sends to backend:**
   ```javascript
   POST /api/oracle/contributions
   {
     ...contribution,
     "signature": "0xmno345..."
   }
   ```

7. **Backend processes:**
   - Stores on Walrus → Returns blob ID
   - Indexes contribution
   - Returns success response

8. **Frontend updates UI:**
   - Shows "Stake submitted!" message
   - Updates total stake amount on prediction
   - Shows user's stake
   - Shows pending status

9. **Oracle service (background):**
    - Queries contributions
    - Verifies signature
    - Aggregates metrics (total stake volume)
    - Updates smart contract
    - Token price recalculates (stakes show confidence!)

10. **When prediction resolves:**
    - If accurate: User gets share of rewards
    - If inaccurate: Stake may be lost
    - Frontend shows stake outcome
    - User sees rewards earned

**UI Elements Needed:**
- Prediction card with stake button
- Stake modal
- Stake amount input
- Total stake display
- User's stake display
- Stake outcome display
- Rewards display

---

### Flow 6: User Trades IP Tokens

**Step-by-Step:**

1. **User lands on marketplace page**
   - Sees list of IP tokens
   - Sees current prices
   - Sees "Buy" and "Sell" buttons

2. **User clicks "Buy" on an IP token**
   - Modal/drawer opens
   - Shows current price
   - Amount input (how many tokens)
   - Total cost calculation
   - "Place Buy Order" button

3. **User enters amount:**
   - Amount: 100 tokens
   - Total cost: 10 SUI (calculated)
   - User clicks "Place Buy Order"

4. **Frontend creates market order:**
   ```javascript
   {
     "ip_token_id": "0x123...",
     "order_type": "buy",
     "quantity": 100,
     "price_per_token": 0.1,
     "total_cost": 10,
     "user_wallet": "0x6df..."
   }
   ```

5. **Frontend calls smart contract:**
   ```javascript
   // Calls marketplace::create_buy_order()
   const tx = await suiClient.call({
     packageId: PACKAGE_ID,
     module: 'marketplace',
     function: 'create_buy_order',
     arguments: [
       marketplaceObject,
       ipTokenId,
       quantity,
       paymentCoin
     ]
   })
   ```

6. **Smart contract processes:**
   - Creates buy order
   - Holds payment in escrow
   - Matches with sell orders if available
   - Executes trade if matched
   - Returns tokens to buyer

7. **Frontend updates UI:**
   - Shows "Order placed!" message
   - Updates user's token balance
   - Shows order in order history
   - Shows if order was filled

8. **If order not filled:**
   - Order stays in order book
   - User can cancel order
   - Frontend shows pending order

**UI Elements Needed:**
- Marketplace page
- IP token list
- Token card component
- Buy/Sell buttons
- Order modal
- Amount input
- Price display
- Total cost calculation
- Order history
- Order book
- User's token balance
- Transaction status

---

## Backend Processing

### How Backend Handles Contributions

**When Frontend Sends Contribution:**

1. **POST /api/oracle/contributions**
   - Receives contribution object with signature
   - Validates required fields (ip_token_id, engagement_type, user_wallet, signature)

2. **WalrusService.storeContribution()**
   - Converts contribution to JSON string
   - Writes to temporary file
   - Executes: `walrus store <file> --epochs 365`
   - Parses blob ID from output
   - Cleans up temp file
   - Returns contribution with blob ID

3. **WalrusIndexerService.indexContribution()**
   - Adds blob ID to index (ipTokenId -> [blobId1, blobId2, ...])
   - Caches metadata (engagement_type, timestamp, user_wallet)
   - Enables fast querying later

4. **Response to Frontend:**
   ```json
   {
     "success": true,
     "contribution": {
       ...contribution,
       "blobId": "bafybeigdyrzt5sfp7..."
     }
   }
   ```

### How Backend Aggregates Metrics

**Oracle Service (Scheduled or Manual):**

1. **Query Contributions:**
   ```javascript
   GET /api/oracle/contributions/:ipTokenId
   ```
   - WalrusIndexerService queries index
   - Gets all blob IDs for IP token
   - Reads contributions from Walrus
   - Returns array of contributions

2. **Verify Signatures:**
   ```javascript
   VerificationService.verifyContributions(contributions)
   ```
   - For each contribution:
     - Reconstructs message (without signature/CID)
     - Verifies signature using Sui's verifyPersonalMessageSignature
     - Filters out invalid signatures
   - Returns verified contributions

3. **Aggregate Metrics:**
   ```javascript
   AggregationService.aggregateMetrics(verifiedContributions)
   ```
   - Calculates:
     - Average rating (from rating contributions)
     - Total contributors (unique wallets)
     - Total engagements (contribution count)
     - Rating count
     - Meme count
     - Post count
     - Episode prediction count
     - Price prediction count
     - Stake count
     - Viral content score (from meme/post engagement)
     - Total stake volume
     - Growth rate (week-over-week)
     - Engagement velocity (contributions per day)
     - New contributors this week
   - Returns aggregated metrics

4. **Update Smart Contract:**
   ```javascript
   POST /api/oracle/update/:ipTokenId
   ```
   - SuiService.updateEngagementMetrics()
   - Constructs Sui transaction
   - Calls `oracle::update_engagement_metrics()`
   - Executes transaction
   - Returns transaction digest

### Scheduled Updates

**OracleScheduler runs every hour (configurable):**

1. Gets list of all IP tokens (from smart contract or config)
2. For each IP token:
   - Queries contributions
   - Verifies signatures
   - Aggregates metrics
   - Updates smart contract
3. Logs results
4. Tracks metrics

---

## Smart Contract Interactions

### Contract Modules

**1. Token Module (`token.move`)**
- Creates IP tokens
- Manages token registry
- Admin functions

**2. Marketplace Module (`marketplace.move`)**
- Creates buy/sell orders
- Matches orders
- Executes trades
- Manages order book

**3. Oracle Module (`oracle.move`)**
- Stores engagement metrics
- Updates metrics (called by backend)
- Calculates token prices
- Price formula: `new_price = base_price * (1 + growth_rate * multiplier)`

**4. Rewards Module (`rewards.move`)**
- Tracks contributor records
- Calculates rewards
- Distributes rewards
- Handles early contributor bonuses
- Handles prediction accuracy rewards
- Handles viral content rewards

### Frontend Contract Calls

**1. Create Buy Order:**
```javascript
const tx = await suiClient.call({
  packageId: PACKAGE_ID,
  module: 'marketplace',
  function: 'create_buy_order',
  arguments: [
    marketplaceObject,  // Shared object
    ipTokenId,          // String
    quantity,           // u64
    paymentCoin         // Coin<SUI>
  ]
})
```

**2. Create Sell Order:**
```javascript
const tx = await suiClient.call({
  packageId: PACKAGE_ID,
  module: 'marketplace',
  function: 'create_sell_order',
  arguments: [
    marketplaceObject,  // Shared object
    ipTokenId,          // String
    quantity,           // u64
    pricePerToken       // u64
  ]
})
```

**3. Get Token Price:**
```javascript
// Read from oracle module
const priceData = await suiClient.getObject({
  id: oracleObjectId,
  options: {
    showContent: true
  }
})
```

**4. Get User's Token Balance:**
```javascript
const balance = await suiClient.getBalance({
  owner: userWallet,
  coinType: `${PACKAGE_ID}::token::IPToken`
})
```

**5. Get Engagement Metrics:**
```javascript
// Read from oracle module
const metrics = await suiClient.getObject({
  id: oracleObjectId,
  options: {
    showContent: true
  }
})
```

---

## Data Flow Diagrams

### Complete Contribution Flow

```
┌─────────────┐
│    User     │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. User creates contribution
       │    (rating, meme, prediction, stake)
       ▼
┌─────────────────────────────────┐
│        Frontend (React)         │
│  - Form inputs                  │
│  - Wallet connection            │
│  - Signature request            │
└──────┬──────────────────────────┘
       │
       │ 2. POST /api/oracle/contributions
       │    { contribution + signature }
       ▼
┌─────────────────────────────────┐
│      Backend (Node.js)          │
│  - Validates input              │
│  - Stores on Walrus             │
│  - Indexes contribution         │
└──────┬──────────────────────────┘
       │
       │ 3. Stores on Walrus
       │    Returns blob ID
       ▼
┌─────────────────────────────────┐
│      Walrus Storage             │
│  - Decentralized storage        │
│  - Immutable data               │
│  - Wallet signatures            │
└─────────────────────────────────┘
       │
       │ 4. Oracle service queries
       │    (scheduled or manual)
       ▼
┌─────────────────────────────────┐
│      Oracle Service             │
│  - Queries contributions        │
│  - Verifies signatures          │
│  - Aggregates metrics           │
└──────┬──────────────────────────┘
       │
       │ 5. Updates smart contract
       │    Calls oracle::update_engagement_metrics()
       ▼
┌─────────────────────────────────┐
│    Sui Smart Contracts          │
│  - Updates metrics              │
│  - Recalculates price           │
│  - Updates contributor records  │
└──────┬──────────────────────────┘
       │
       │ 6. Price updates
       │    Frontend polls/updates
       ▼
┌─────────────────────────────────┐
│        Frontend (React)         │
│  - Shows updated price          │
│  - Shows updated metrics        │
│  - Shows user's contribution    │
└─────────────────────────────────┘
```

### Price Update Flow

```
┌─────────────────────────────────┐
│    Oracle Scheduler             │
│  (Runs every hour)              │
└──────┬──────────────────────────┘
       │
       │ 1. For each IP token
       ▼
┌─────────────────────────────────┐
│  Query Contributions            │
│  - Get all blob IDs from index  │
│  - Read from Walrus             │
└──────┬──────────────────────────┘
       │
       │ 2. Verify Signatures
       ▼
┌─────────────────────────────────┐
│  Verification Service           │
│  - Verify each signature        │
│  - Filter invalid               │
└──────┬──────────────────────────┘
       │
       │ 3. Aggregate Metrics
       ▼
┌─────────────────────────────────┐
│  Aggregation Service            │
│  - Calculate averages           │
│  - Count contributions          │
│  - Calculate growth rates       │
│  - Calculate viral scores       │
└──────┬──────────────────────────┘
       │
       │ 4. Update Smart Contract
       ▼
┌─────────────────────────────────┐
│  Sui Service                    │
│  - Call update_engagement_      │
│    metrics()                    │
│  - Execute transaction          │
└──────┬──────────────────────────┘
       │
       │ 5. Smart Contract
       ▼
┌─────────────────────────────────┐
│  Oracle Module                  │
│  - Update EngagementMetrics     │
│  - Recalculate price            │
│  - Trigger price update event   │
└──────┬──────────────────────────┘
       │
       │ 6. Price Updated
       ▼
┌─────────────────────────────────┐
│  Frontend                       │
│  - Polls for price updates      │
│  - Updates UI                   │
│  - Shows new price              │
└─────────────────────────────────┘
```

---

## UI/UX Requirements

### Design Principles

1. **Clear Contribution Types**
   - Each contribution type should have distinct UI
   - Visual indicators for different types
   - Easy to understand what each type does

2. **Real-Time Updates**
   - Show pending states
   - Update prices in real-time
   - Show contribution status

3. **Wallet Integration**
   - Clear wallet connection flow
   - Signature requests should be clear
   - Show wallet address and balance

4. **Contribution History**
   - Users should see their contributions
   - Show contribution status (pending, verified, rewarded)
   - Show rewards earned

5. **Price Visibility**
   - Current price prominently displayed
   - Price history/chart
   - Price change indicators

6. **Engagement Metrics**
   - Show average rating
   - Show contribution counts
   - Show growth indicators
   - Show viral content indicators

### Key UI Components Needed

1. **IP Token Page**
   - Header with IP name and image
   - Current price display
   - Price chart
   - Rating section
   - Meme feed
   - Predictions section
   - Contribution buttons

2. **Contribution Modals**
   - Rating modal
   - Meme upload modal
   - Prediction modal
   - Stake modal

3. **Marketplace**
   - IP token list
   - Token cards
   - Buy/Sell modals
   - Order book
   - Order history

4. **User Dashboard**
   - User's contributions
   - Rewards earned
   - Token holdings
   - Prediction outcomes

5. **Wallet Integration**
   - Connect wallet button
   - Wallet address display
   - Balance display
   - Signature request modal

---

## Screen-by-Screen Breakdown

### Screen 1: Home Page

**Layout:**
- Header: Logo, Navigation, Connect Wallet
- Hero Section: Platform description
- Featured IPs: Carousel of popular IPs
- Trending: Trending IPs by price/engagement
- Recent Activity: Recent contributions

**Components:**
- IP Card (image, name, price, rating)
- Trending Badge
- Activity Feed Item

**Interactions:**
- Click IP card → Navigate to IP page
- Click Connect Wallet → Wallet modal
- Scroll → Load more IPs

---

### Screen 2: IP Token Page

**Layout:**
- Header: IP name, image, back button
- Price Section: Current price, price chart, change indicator
- Stats Section: Average rating, total contributors, engagement counts
- Tabs: Overview, Memes, Predictions, Trading
- Contribution Buttons: Rate, Post Meme, Make Prediction

**Components:**
- Price Display (large, prominent)
- Price Chart (line chart)
- Rating Display (stars, average, count)
- Stats Cards (contributors, engagements, growth)
- Meme Feed (grid of memes)
- Predictions List (cards)
- Contribution Buttons

**Interactions:**
- Click Rate → Rating modal
- Click Post Meme → Meme upload modal
- Click Make Prediction → Prediction modal
- Click Meme → Meme detail view
- Click Prediction → Prediction detail view
- Switch tabs → Show different content

---

### Screen 3: Rating Modal

**Layout:**
- Modal/Drawer overlay
- Header: "Rate [IP Name]"
- Rating Input: Star selector or slider (1-10)
- Review Text: Optional textarea
- Submit Button
- Close Button

**Components:**
- Star Rating Component
- Text Input
- Button

**Interactions:**
- Select rating → Update display
- Type review → Update text
- Click Submit → Request signature → Submit
- Click Close → Close modal

---

### Screen 4: Meme Upload Modal

**Layout:**
- Modal/Drawer overlay
- Header: "Post Meme"
- Image Upload: Drag & drop or file picker
- Image Preview: Show uploaded image
- Caption Input: Text field
- Tags Input: Tag chips
- Submit Button
- Close Button

**Components:**
- File Upload Component
- Image Preview
- Text Input
- Tag Input
- Button

**Interactions:**
- Upload image → Show preview
- Type caption → Update text
- Add tags → Add tag chips
- Click Submit → Upload to IPFS → Request signature → Submit
- Click Close → Close modal

---

### Screen 5: Prediction Modal

**Layout:**
- Modal/Drawer overlay
- Header: "Make Prediction"
- Prediction Type: Episode Release or Price Movement
- Inputs: Episode number, date, or percentage, timeframe
- Stake Input: Optional stake amount
- Submit Button
- Close Button

**Components:**
- Type Selector (tabs or radio)
- Date Picker
- Number Input
- Stake Input
- Button

**Interactions:**
- Select type → Show relevant inputs
- Fill inputs → Update display
- Click Submit → Request signature → Submit
- Click Close → Close modal

---

### Screen 6: Marketplace Page

**Layout:**
- Header: Navigation, Connect Wallet
- IP Token List: Grid or list of tokens
- Filters: Search, sort options
- Token Cards: Image, name, price, change

**Components:**
- IP Token Card
- Search Bar
- Filter Dropdown
- Sort Options

**Interactions:**
- Click token → Navigate to IP page
- Search → Filter tokens
- Sort → Reorder tokens
- Click Buy/Sell → Order modal

---

### Screen 7: User Dashboard

**Layout:**
- Header: User wallet address, balance
- Tabs: Contributions, Rewards, Holdings, Predictions
- Contributions List: User's contributions
- Rewards Display: Total earned, breakdown
- Holdings: Token balances
- Predictions: User's predictions and outcomes

**Components:**
- Contribution Card
- Reward Card
- Token Balance Card
- Prediction Card

**Interactions:**
- Switch tabs → Show different content
- Click contribution → View details
- Click prediction → View outcome

---

## State Management

### Frontend State Structure

```javascript
{
  // Wallet
  wallet: {
    connected: boolean,
    address: string,
    balance: number
  },
  
  // IP Tokens
  ipTokens: {
    [ipTokenId]: {
      id: string,
      name: string,
      image: string,
      price: number,
      priceHistory: Array,
      metrics: {
        averageRating: number,
        totalContributors: number,
        totalEngagements: number,
        ratingCount: number,
        memeCount: number,
        postCount: number,
        predictionCount: number,
        stakeCount: number,
        viralContentScore: number,
        growthRate: number
      }
    }
  },
  
  // Contributions
  contributions: {
    [ipTokenId]: Array<{
      id: string,
      type: string,
      user: string,
      timestamp: number,
      status: 'pending' | 'verified' | 'rewarded',
      data: Object
    }>
  },
  
  // User Data
  user: {
    contributions: Array,
    rewards: {
      total: number,
      breakdown: Object
    },
    holdings: {
      [ipTokenId]: number
    },
    predictions: Array
  },
  
  // UI State
  ui: {
    modals: {
      rating: boolean,
      meme: boolean,
      prediction: boolean,
      stake: boolean,
      wallet: boolean
    },
    loading: {
      [key]: boolean
    }
  }
}
```

---

## API Integration Points

### Backend API Endpoints

**Base URL:** `http://localhost:3000` (development)

**Endpoints:**

1. **Store Contribution**
   ```
   POST /api/oracle/contributions
   Body: { contribution object }
   Response: { success: true, contribution: {...} }
   ```

2. **Query Contributions**
   ```
   GET /api/oracle/contributions/:ipTokenId
   Query: ?type=rating&startTime=...&endTime=...
   Response: { success: true, contributions: [...] }
   ```

3. **Get Metrics**
   ```
   GET /api/oracle/metrics/:ipTokenId
   Response: { success: true, metrics: {...} }
   ```

4. **Update On-Chain**
   ```
   POST /api/oracle/update/:ipTokenId
   Response: { success: true, transaction: {...} }
   ```

5. **Health Check**
   ```
   GET /health
   Response: { status: 'healthy', ... }
   ```

### Sui Contract Interactions

**Package ID:** Set after deployment
**Network:** Testnet/Mainnet

**Contract Calls:**
- `marketplace::create_buy_order()`
- `marketplace::create_sell_order()`
- `oracle::get_engagement_metrics()` (read)
- `rewards::get_contributor_record()` (read)

**Contract Reads:**
- Read oracle object for metrics
- Read marketplace object for orders
- Read user's token balance
- Read price data

---

## Design Considerations for Figma

### Color Scheme

- **Primary:** Brand color (to be defined)
- **Success:** Green (for successful transactions)
- **Warning:** Yellow (for pending states)
- **Error:** Red (for errors)
- **Info:** Blue (for information)

### Typography

- **Headings:** Bold, large
- **Body:** Regular, readable
- **Labels:** Medium weight
- **Numbers:** Monospace (for prices, amounts)

### Spacing

- Consistent spacing system (4px, 8px, 16px, 24px, 32px)
- Card padding: 16px-24px
- Section spacing: 32px-48px

### Components to Design

1. **Buttons**
   - Primary (filled)
   - Secondary (outlined)
   - Tertiary (text)
   - Disabled states
   - Loading states

2. **Cards**
   - IP Token Card
   - Contribution Card
   - Meme Card
   - Prediction Card
   - Reward Card

3. **Modals**
   - Rating Modal
   - Meme Upload Modal
   - Prediction Modal
   - Stake Modal
   - Wallet Connect Modal

4. **Inputs**
   - Text Input
   - Number Input
   - Date Picker
   - File Upload
   - Tag Input

5. **Displays**
   - Price Display
   - Rating Display
   - Stats Cards
   - Chart Component
   - Badge Component

6. **Navigation**
   - Header
   - Tabs
   - Sidebar (if needed)
   - Breadcrumbs

### Responsive Design

- **Mobile:** Single column, stacked layout
- **Tablet:** 2 columns where appropriate
- **Desktop:** Multi-column, side-by-side layouts

### Accessibility

- Clear contrast ratios
- Keyboard navigation
- Screen reader support
- Focus indicators
- Error messages

---

## Summary

This guide covers:
- ✅ All user flows (rating, meme, prediction, stake, trading)
- ✅ Backend processing details
- ✅ Smart contract interactions
- ✅ Data flow diagrams
- ✅ UI/UX requirements
- ✅ Screen-by-screen breakdown
- ✅ State management structure
- ✅ API integration points
- ✅ Design considerations for Figma

Use this document to design the frontend in Figma, ensuring all flows and interactions are properly represented in the design.

