# ODX - Otaku Data Exchange Smart Contracts

## Overview

ODX (Otaku Data Exchange) is a decentralized data market for anime, manga, and manhwa fandom engagement. This project implements the smart contract layer on Sui blockchain that enables:

- **Token Creation**: Create IP tokens for anime/manga/manhwa with fixed supply (200k tokens per IP)
- **Marketplace Trading**: Buy and sell IP tokens based on engagement data
- **Reward Distribution**: Track contributors and distribute tokens from reserve pools
- **Price Oracle**: Calculate token prices based on engagement metrics from Walrus storage

## Project Structure

```
smartcontract/odx/
├── sources/
│   ├── datatypes.move      # Shared data structures and types
│   ├── token.move          # IP token creation and management
│   ├── marketplace.move    # Trading functionality (buy/sell orders)
│   ├── rewards.move        # Contributor tracking and reward distribution
│   ├── oracle.move         # Price calculation based on engagement metrics
│   └── odx.move            # Main library module
├── tests/
│   └── odx_tests.move      # Test suite (to be implemented)
├── Move.toml               # Package configuration
└── README.md               # This file
```

## Modules

### 1. datatypes.move

**Purpose**: Defines all shared data structures used across the ODX platform.

**Key Structures**:
- `IPTokenMetadata`: Stores IP information (name, symbol, description, category)
- `IPToken`: Represents a tokenized IP with fixed supply (200k), reserve pool, and circulating supply
- `EngagementData`: Single engagement event from a user (rating, prediction, timestamp)
- `EngagementMetrics`: Aggregated metrics (average rating, contributor count, growth rate)
- `PriceData`: Current price information for an IP token
- `ContributorRecord`: Tracks user contributions and rewards
- `RewardDistribution`: Records reward distribution events
- `MarketOrder`: Buy/sell orders in the marketplace

**Key Functions**:
- Constructor functions for all structs
- Getter/setter functions for accessing private fields
- Constants for engagement types, order types, and status codes

### 2. token.move

**Purpose**: Manages IP token creation, supply, and reserve pools.

**Key Functions**:
- `init()`: Initializes the token module, creates AdminCap and TokenRegistry
- `create_ip_token()`: Creates a new IP token with fixed supply of 200k tokens
  - Validates reserve pool size
  - Creates metadata
  - Sets initial circulating supply
  - Adds token to registry
- `update_reserve_pool()`: Admin function to adjust reserve pool size
- `release_from_reserve()`: Releases tokens from reserve pool for rewards
- `get_token_info()`: Returns token information (name, symbol, supply, etc.)

**Key Features**:
- Fixed supply: 200k tokens per IP
- Reserve pool: Configurable amount reserved for contributor rewards
- Admin controls: Only admin can create tokens and manage reserves

### 3. marketplace.move

**Purpose**: Handles trading of IP tokens with buy/sell order functionality.

**Key Functions**:
- `init()`: Initializes marketplace with default 1% trading fee
- `create_buy_order()`: Creates a buy order
  - Validates price and quantity
  - Calculates total cost and fee
  - Extracts required payment
  - Returns order and remaining payment
- `create_sell_order()`: Creates a sell order
- `execute_buy_order()`: Executes buy order (matches with sell orders)
- `execute_sell_order()`: Executes sell order (matches with buy orders)
- `cancel_order()`: Cancels an active order
- `update_trading_fee()`: Admin function to update trading fee

**Key Features**:
- Order book model: Tracks buy and sell orders separately
- Trading fees: Configurable fee percentage (default 1%)
- Order status: Active, partially filled, filled, cancelled
- Payment handling: Automatically splits payment and returns remainder

### 4. rewards.move

**Purpose**: Tracks contributors and distributes rewards based on engagement.

**Key Functions**:
- `init()`: Initializes rewards registry and configuration
- `register_engagement()`: Registers a user engagement with an IP token
  - Creates or updates contributor record
  - Tracks early contributors (first 100)
  - Updates average rating
- `calculate_reward()`: Calculates reward amount based on:
  - Early contributor bonus (2x multiplier)
  - Prediction accuracy bonus (1.5x for >70% accuracy)
  - Viral content bonus (3x for 1000+ engagements)
- `distribute_reward()`: Releases tokens from IP token reserve pool
  - Updates contributor total rewards
  - Records distribution in history
- `update_prediction_accuracy()`: Updates contributor's prediction accuracy score

**Key Features**:
- Early contributor tracking: First 100 contributors get bonus
- Multi-factor rewards: Based on timing, accuracy, and engagement volume
- Reserve pool integration: Automatically releases tokens from IP token reserves
- Contributor records: Tracks engagement count, ratings, and rewards

### 5. oracle.move

**Purpose**: Calculates token prices based on engagement metrics from Walrus.

**Key Functions**:
- `init()`: Initializes price oracle and admin capability
- `initialize_token_price()`: Sets initial price for a new IP token
- `update_engagement_metrics()`: Updates metrics from Walrus data (called by off-chain oracle)
  - Average rating
  - Total contributors
  - Total engagements
  - Prediction accuracy
  - Growth rate
- `recalculate_price()`: Recalculates token price using formula:
  ```
  price = base_price * (1 + (growth_rate / 10000) * (multiplier / 100))
  ```
- `get_price()`: Returns current price for an IP token
- `sync_metrics_from_registry()`: Syncs on-chain contributor data with metrics

**Key Features**:
- Price formula: Base price adjusted by engagement growth rate
- Engagement multiplier: Configurable multiplier for price impact
- Automatic recalculation: Price updates when metrics change
- Oracle integration: Designed to work with off-chain oracle reading from Walrus

## How It Works

### 1. Token Creation Flow

```
Admin → create_ip_token()
  ├─ Validates reserve pool size
  ├─ Creates IPTokenMetadata
  ├─ Creates IPToken with:
  │   ├─ Total supply: 200k
  │   ├─ Reserve pool: X tokens
  │   └─ Circulating supply: 200k - X
  └─ Adds to TokenRegistry
```

### 2. Engagement & Rewards Flow

```
User → register_engagement()
  ├─ Creates/updates ContributorRecord
  ├─ Tracks if early contributor
  ├─ Updates average rating
  └─ Updates contributor count

Oracle → update_engagement_metrics()
  ├─ Reads data from Walrus
  ├─ Updates EngagementMetrics
  └─ Triggers price recalculation

Admin → distribute_reward()
  ├─ Calculates reward amount
  ├─ Releases from IP token reserve pool
  ├─ Updates contributor total rewards
  └─ Records in reward history
```

### 3. Trading Flow

```
Buyer → create_buy_order()
  ├─ Validates payment
  ├─ Creates MarketOrder
  ├─ Extracts required payment
  └─ Returns order + remainder

Seller → create_sell_order()
  ├─ Validates quantity
  ├─ Creates MarketOrder
  └─ Returns order

Marketplace → execute_buy_order() / execute_sell_order()
  ├─ Matches orders
  ├─ Updates order status
  └─ Returns execution result
```

### 4. Price Calculation Flow

```
Walrus Data → Oracle Service → update_engagement_metrics()
  ├─ Aggregates engagement data
  ├─ Calculates metrics:
  │   ├─ Average rating
  │   ├─ Growth rate
  │   ├─ Contributor count
  │   └─ Prediction accuracy
  └─ Triggers recalculate_price()
      └─ Updates PriceData
          └─ price = base_price * (1 + growth_factor)
```

## Key Design Decisions

### Fixed Supply Model
- Each IP token has exactly 200k tokens
- Prevents inflation
- Creates scarcity value

### Reserve Pool System
- Portion of tokens reserved for rewards
- Encourages early engagement
- Rewards contributors for making content popular

### Engagement-Based Pricing
- Price reflects real engagement data
- Growth rate drives price changes
- Oracle ensures data integrity

### Modular Architecture
- Separate modules for different concerns
- Shared datatypes for consistency
- Clear separation of responsibilities

## Constants & Configuration

### Token Supply
- `FIXED_TOKEN_SUPPLY`: 200,000 tokens per IP

### Early Contributor Threshold
- `EARLY_CONTRIBUTOR_THRESHOLD`: First 100 contributors get bonus

### Reward Multipliers (Default)
- Early contributor: 2x
- Prediction accuracy (>70%): 1.5x
- Viral content (1000+ engagements): 3x
- Base reward: 100 tokens per engagement

### Trading Fees
- Default: 1% (100 basis points)
- Maximum: 10% (1000 basis points)

### Price Calculation
- Base price: Set during token initialization
- Growth rate: Percentage scaled by 100
- Multiplier: Default 1.0x (100)

## Testing

Tests are located in `tests/odx_tests.move`. To run tests:

```bash
sui move test
```

Test coverage should include:
- Token creation and management
- Marketplace order creation and execution
- Reward calculation and distribution
- Price calculation and updates
- Edge cases and error handling

## Deployment

### Prerequisites
- Sui CLI installed and configured
- Sui testnet account with SUI tokens

### Build
```bash
cd smartcontract/odx
sui move build
```

### Deploy
```bash
sui client publish --gas-budget 10000000
```

### Initialize Modules
After deployment, initialize each module:
1. Token module: Creates AdminCap and TokenRegistry
2. Marketplace: Creates Marketplace object
3. Rewards: Creates RewardsRegistry and RewardConfig
4. Oracle: Creates PriceOracle and OracleAdminCap

## Integration with Walrus

**Walrus is critical to ODX's data ownership model.** See [WALRUS_INTEGRATION.md](./WALRUS_INTEGRATION.md) for a complete explanation.

**Quick Summary:**
- **Engagement Data**: Stored on Walrus with wallet signatures (users own their data)
- **Oracle Service**: Reads from Walrus and updates on-chain metrics
- **Data Aggregation**: Oracle aggregates Walrus data into EngagementMetrics
- **Price Updates**: Metrics trigger automatic price recalculation
- **Attribution**: Cryptographic proof of who created which engagement
- **Verification**: Immutable, timestamped data prevents gaming

**Why Walrus Matters:**
- Users cryptographically own their engagement data
- Token prices based on real, verifiable engagement
- Rewards can't be gamed (signatures prove authenticity)
- Platform can't manipulate or censor data

## Future Enhancements

- [ ] Implement full order matching algorithm
- [ ] Add perpetual futures trading
- [ ] Implement AMM (Automated Market Maker) option
- [ ] Add more sophisticated reward algorithms
- [ ] Implement governance mechanisms
- [ ] Add staking functionality
- [ ] Create frontend integration examples


