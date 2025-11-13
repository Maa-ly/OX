# Contract Service Documentation

## Overview

The Contract Service (`src/services/contract.js`) provides a comprehensive interface for interacting with all ODX smart contract functions. It handles token creation, marketplace operations, oracle updates, and rewards distribution.

## Setup

### 1. Admin Keypair Configuration

The contract service requires an admin keypair to sign transactions. Set the `ADMIN_PRIVATE_KEY` environment variable in your `.env` file.

#### Getting Your Admin Private Key

1. **Export your keypair from Sui CLI:**
   ```bash
   sui keytool export <key-alias> --json
   ```

2. **Extract the private key:**
   The output will be a JSON object. Extract the private key bytes (it's a base64-encoded string).

3. **Add to `.env`:**
   ```env
   ADMIN_PRIVATE_KEY=<base64-encoded-private-key>
   ```

#### Alternative: Generate a New Keypair

If you need to create a new admin keypair:

```bash
# Generate new keypair
sui keytool generate ed25519

# Export it
sui keytool export <new-key-alias> --json
```

**⚠️ Security Warning:** Never commit your private key to version control. Keep it secure and only in your `.env` file (which should be in `.gitignore`).

## Available Functions

### Token Module

#### `createIPToken(params)`
Create a new IP token.

**Parameters:**
- `name` (string): Token name (e.g., "Chainsaw Man")
- `symbol` (string): Token symbol (e.g., "CSM")
- `description` (string): Token description
- `category` (number): Category (0=anime, 1=manga, 2=manhwa)
- `reservePoolSize` (number): Reserve pool size (must be < total supply)

**Returns:** Transaction result with created token ID

**Example:**
```javascript
const result = await contractService.createIPToken({
  name: "Chainsaw Man",
  symbol: "CSM",
  description: "Chainsaw Man IP token",
  category: 0, // anime
  reservePoolSize: 50000
});
```

#### `getTokenInfo(tokenId)`
Get token information.

**Parameters:**
- `tokenId` (string): IP token object ID

**Returns:** Token information object

#### `updateReservePool(tokenId, newReserveSize)`
Update reserve pool size.

**Parameters:**
- `tokenId` (string): IP token object ID
- `newReserveSize` (number): New reserve pool size

#### `getAllTokens()`
Get all token IDs from registry.

**Returns:** Array of token IDs

### Marketplace Module

#### `createBuyOrder(params)`
Create a buy order.

**Parameters:**
- `ipTokenId` (string): IP token ID
- `price` (number): Price per token (scaled by 1e9)
- `quantity` (number): Quantity to buy
- `paymentCoinId` (string): Payment coin object ID

#### `createSellOrder(params)`
Create a sell order.

**Parameters:**
- `ipTokenId` (string): IP token ID
- `price` (number): Price per token (scaled by 1e9)
- `quantity` (number): Quantity to sell

#### `executeBuyOrder(orderId)`
Execute a buy order.

**Parameters:**
- `orderId` (string): Buy order object ID

#### `executeSellOrder(orderId)`
Execute a sell order.

**Parameters:**
- `orderId` (string): Sell order object ID

#### `cancelOrder(orderId)`
Cancel an order.

**Parameters:**
- `orderId` (string): Order object ID

### Oracle Module

#### `initializeTokenPrice(ipTokenId, basePrice)`
Initialize price data for a new IP token.

**Parameters:**
- `ipTokenId` (string): IP token ID
- `basePrice` (number): Base price in SUI (scaled by 1e9)

#### `updateEngagementMetrics(params)`
Update engagement metrics on-chain.

**Parameters:**
- `ipTokenId` (string): IP token ID
- `averageRating` (number): Average rating (scaled by 100, e.g., 850 = 8.50)
- `totalContributors` (number): Total number of contributors
- `totalEngagements` (number): Total engagement count
- `predictionAccuracy` (number): Prediction accuracy score (0-10000)
- `growthRate` (number): Growth rate percentage (scaled by 100)

**Example:**
```javascript
await contractService.updateEngagementMetrics({
  ipTokenId: "0x...",
  averageRating: 850, // 8.5/10
  totalContributors: 150,
  totalEngagements: 500,
  predictionAccuracy: 7500, // 75%
  growthRate: 2500 // 25% growth
});
```

#### `getPrice(ipTokenId)`
Get current price for an IP token.

**Parameters:**
- `ipTokenId` (string): IP token ID

**Returns:** Current price or null

#### `getEngagementMetrics(ipTokenId)`
Get engagement metrics for an IP token.

**Parameters:**
- `ipTokenId` (string): IP token ID

**Returns:** Engagement metrics object or null

#### `recalculatePrice(ipTokenId)`
Recalculate price for an IP token based on current metrics.

**Parameters:**
- `ipTokenId` (string): IP token ID

### Rewards Module

#### `registerEngagement(params)`
Register an engagement (placeholder - needs proper implementation).

**Parameters:**
- `ipTokenId` (string): IP token ID
- `userAddress` (string): User address
- `rating` (number): Rating (0-10)
- `engagementType` (number): Engagement type

#### `distributeReward(params)`
Distribute reward to contributor.

**Parameters:**
- `ipTokenId` (string): IP token object ID (not just ID string)
- `userAddress` (string): User address
- `reason` (number): Reward reason (0-3)

#### `getContributor(ipTokenId, userAddress)`
Get contributor record.

**Parameters:**
- `ipTokenId` (string): IP token ID
- `userAddress` (string): User address

**Returns:** Contributor record or null

#### `getContributorCount(ipTokenId)`
Get contributor count for an IP token.

**Parameters:**
- `ipTokenId` (string): IP token ID

**Returns:** Contributor count

## API Routes

All contract functions are exposed via REST API routes under `/api/contract`:

### Token Routes
- `POST /api/contract/tokens` - Create IP token
- `GET /api/contract/tokens` - Get all tokens
- `GET /api/contract/tokens/:tokenId` - Get token info
- `PUT /api/contract/tokens/:tokenId/reserve` - Update reserve pool

### Marketplace Routes
- `POST /api/contract/marketplace/buy` - Create buy order
- `POST /api/contract/marketplace/sell` - Create sell order
- `POST /api/contract/marketplace/orders/:orderId/execute-buy` - Execute buy order
- `POST /api/contract/marketplace/orders/:orderId/execute-sell` - Execute sell order
- `POST /api/contract/marketplace/orders/:orderId/cancel` - Cancel order

### Oracle Routes
- `POST /api/contract/oracle/initialize-price` - Initialize token price
- `POST /api/contract/oracle/update-metrics` - Update engagement metrics
- `GET /api/contract/oracle/price/:ipTokenId` - Get price
- `GET /api/contract/oracle/metrics/:ipTokenId` - Get engagement metrics
- `POST /api/contract/oracle/recalculate/:ipTokenId` - Recalculate price

### Rewards Routes
- `POST /api/contract/rewards/register` - Register engagement
- `POST /api/contract/rewards/distribute` - Distribute reward
- `GET /api/contract/rewards/contributor/:ipTokenId/:userAddress` - Get contributor
- `GET /api/contract/rewards/contributors/:ipTokenId` - Get contributor count

### Utility Routes
- `GET /api/contract/objects/:objectId` - Get object details

## Error Handling

All functions throw errors that should be caught and handled appropriately. Common errors:

- `Admin keypair not configured` - Set `ADMIN_PRIVATE_KEY` in `.env`
- `Oracle configuration incomplete` - Check that all required object IDs are set in `.env`
- Transaction errors - Check gas balance, object IDs, and parameters

## Integration with Oracle Service

The contract service is integrated with the existing oracle service. The `SuiService` class now delegates to `ContractService` for backward compatibility.

## Notes

- All price values are scaled by 1e9 (SUI has 9 decimal places)
- All rating values are scaled by 100 (e.g., 850 = 8.50)
- All percentage values are scaled by 100 (e.g., 2500 = 25%)
- Some functions require the actual object ID (not just a string ID) - check the Move contract for details
- View functions use `devInspectTransactionBlock` which doesn't require gas
- Write functions require a valid admin keypair and sufficient gas balance

