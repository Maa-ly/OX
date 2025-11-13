# ODX Oracle Service - API Documentation

## Base URL

```
http://localhost:3000
```

**Note:** The server automatically finds an available port starting from 3000. Check the server logs to see which port is actually being used.

## Headers

All endpoints accept JSON content type:

```
Content-Type: application/json
```

## Authentication

Currently, no authentication is required. All endpoints are publicly accessible.

---

## Table of Contents

1. [Health Check Endpoints](#health-check-endpoints)
2. [Oracle Endpoints](#oracle-endpoints)
3. [Walrus Endpoints](#walrus-endpoints)
4. [Metrics Endpoints](#metrics-endpoints)
5. [Contract Endpoints](#contract-endpoints)
6. [Error Responses](#error-responses)

---

## Health Check Endpoints

### GET `/health`

Basic health check endpoint.

**Headers:** None required

**Request:** None

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T14:30:00.000Z",
  "service": "ODX Oracle Service",
  "version": "1.0.0"
}
```

---

### GET `/health/detailed`

Comprehensive health check including Walrus, Sui, and configuration status.

**Headers:** None required

**Request:** None

**Response (200 OK - Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T14:30:00.000Z",
  "service": "ODX Oracle Service",
  "version": "1.0.0",
  "config": {
    "suiNetwork": "testnet",
    "walrusContext": "testnet",
    "updateInterval": 3600000
  },
  "checks": {
    "walrus": {
      "healthy": true,
      "checks": {},
      "errors": []
    },
    "sui": {
      "healthy": true,
      "checks": {},
      "details": {},
      "errors": []
    },
    "config": {
      "healthy": true,
      "checks": {},
      "errors": []
    }
  }
}
```

**Response (503 Service Unavailable - Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-13T14:30:00.000Z",
  "service": "ODX Oracle Service",
  "version": "1.0.0",
  "config": { ... },
  "checks": {
    "walrus": {
      "healthy": false,
      "checks": {},
      "errors": ["Walrus binary not found"]
    },
    ...
  }
}
```

---

### GET `/health/quick`

Quick health check for Walrus and Sui connectivity only.

**Headers:** None required

**Request:** None

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T14:30:00.000Z",
  "walrus": true,
  "sui": true
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-13T14:30:00.000Z",
  "walrus": false,
  "sui": true
}
```

---

## Oracle Endpoints

### GET `/api/oracle/contributions/:ipTokenId`

Get all contributions for a specific IP token.

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `ipTokenId` (string, required) - The IP token ID (Sui address format)

**Query Parameters:**
- `type` (string, optional) - Filter by engagement type: `rating`, `meme`, `post`, `episode_prediction`, `price_prediction`, `stake`
- `startTime` (number, optional) - Unix timestamp (milliseconds) - filter contributions after this time
- `endTime` (number, optional) - Unix timestamp (milliseconds) - filter contributions before this time

**Example Request:**
```
GET /api/oracle/contributions/0x123...abc?type=rating&startTime=1736629200000
```

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0x123...abc",
  "count": 5,
  "contributions": [
    {
      "ip_token_id": "0x123...abc",
      "engagement_type": "rating",
      "rating": 9,
      "user_wallet": "0x6df...",
      "signature": "0xabc123...",
      "timestamp": 1736629200000,
      "walrus_cid": "bafybeigdyrzt5sfp7..."
    },
    ...
  ]
}
```

---

### POST `/api/oracle/contributions`

Store a new contribution on Walrus and index it.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "ip_token_id": "0x123...abc",
  "engagement_type": "rating",
  "user_wallet": "0x6df...",
  "signature": "0xabc123...",
  "timestamp": 1736629200000,
  "rating": 9
}
```

**Contribution Types and Required Fields:**

1. **Rating:**
```json
{
  "ip_token_id": "0x123...abc",
  "engagement_type": "rating",
  "user_wallet": "0x6df...",
  "signature": "0xabc123...",
  "timestamp": 1736629200000,
  "rating": 9
}
```

2. **Meme/Post:**
```json
{
  "ip_token_id": "0x123...abc",
  "engagement_type": "meme",
  "user_wallet": "0x6df...",
  "signature": "0xabc123...",
  "timestamp": 1736629200000,
  "content_cid": "bafybeigdyrzt5sfp7...",
  "caption": "When Denji meets Power"
}
```

3. **Prediction:**
```json
{
  "ip_token_id": "0x123...abc",
  "engagement_type": "episode_prediction",
  "user_wallet": "0x6df...",
  "signature": "0xabc123...",
  "timestamp": 1736629200000,
  "prediction": "Episode 12 releases on Dec 25, 2024",
  "stake": 100
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "contribution": {
    "ip_token_id": "0x123...abc",
    "engagement_type": "rating",
    "rating": 9,
    "user_wallet": "0x6df...",
    "signature": "0xabc123...",
    "timestamp": 1736629200000,
    "walrus_cid": "bafybeigdyrzt5sfp7...",
    "blobId": "0xdef456..."
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "ip_token_id is required"
}
```

---

### POST `/api/oracle/verify`

Verify a contribution's signature.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "contribution": {
    "ip_token_id": "0x123...abc",
    "engagement_type": "rating",
    "rating": 9,
    "user_wallet": "0x6df...",
    "signature": "0xabc123...",
    "timestamp": 1736629200000
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "valid": true
}
```

**Response (200 OK - Invalid):**
```json
{
  "success": true,
  "valid": false
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Contribution data is required"
}
```

---

### GET `/api/oracle/metrics/:ipTokenId`

Get aggregated metrics for an IP token.

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `ipTokenId` (string, required) - The IP token ID

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0x123...abc",
  "metrics": {
    "average_rating": 850,
    "total_contributors": 42,
    "total_engagements": 156,
    "rating_count": 89,
    "meme_count": 34,
    "post_count": 12,
    "episode_prediction_count": 15,
    "price_prediction_count": 5,
    "stake_count": 1,
    "viral_content_score": 1250,
    "prediction_accuracy": 0,
    "total_stake_volume": 1000,
    "growth_rate": 2500,
    "engagement_velocity": 5,
    "new_contributors_this_week": 8,
    "last_updated": 1736629200000
  },
  "stats": {
    "totalContributions": 156,
    "verifiedContributions": 154,
    "invalidContributions": 2
  }
}
```

**Metrics Explanation:**
- `average_rating`: Average rating scaled by 100 (e.g., 850 = 8.5/10)
- `total_contributors`: Number of unique wallet addresses
- `total_engagements`: Total number of contributions
- `growth_rate`: Growth percentage scaled by 100 (e.g., 2500 = 25% growth)
- `engagement_velocity`: Contributions per day
- `viral_content_score`: Viral content score (0-10000)

---

### POST `/api/oracle/update/:ipTokenId`

Update engagement metrics on-chain for an IP token.

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `ipTokenId` (string, required) - The IP token ID

**Query Parameters:**
- `force` (boolean, optional) - Force update even if metrics haven't changed

**Request:** None (or empty body)

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0x123...abc",
  "metrics": {
    "average_rating": 850,
    "total_contributors": 42,
    "total_engagements": 156,
    "prediction_accuracy": 0,
    "growth_rate": 2500
  },
  "transaction": {
    "digest": "0x789...xyz",
    "effects": { ... },
    "events": [ ... ]
  }
}
```

**Note:** This endpoint requires smart contracts to be deployed and configured. Will fail if `ORACLE_OBJECT_ID`, `ADMIN_CAP_ID`, or `PACKAGE_ID` are not set in `.env`.

---

### POST `/api/oracle/update-all`

Trigger update for all IP tokens.

**Headers:**
```
Content-Type: application/json
```

**Request:** None (or empty body)

**Response (200 OK):**
```json
{
  "success": true,
  "updated": 3,
  "failed": 0,
  "results": [
    {
      "ipTokenId": "0x123...abc",
      "success": true,
      "result": {
        "digest": "0x789...xyz"
      }
    },
    ...
  ]
}
```

**Note:** Currently returns empty results as IP tokens list is a placeholder (TODO: Get from smart contract).

---

## Walrus Endpoints

### POST `/api/walrus/store`

Store a blob on Walrus storage.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": "Hello, Walrus!",
  "deletable": false,
  "epochs": 365
}
```

**Request Body Fields:**
- `data` (string, required) - The data to store (can be any string)
- `deletable` (boolean, optional) - Whether the blob can be deleted (default: false)
- `epochs` (number, optional) - Number of storage epochs (default: null, uses Walrus default)

**Response (200 OK):**
```json
{
  "success": true,
  "blobId": "0xdef456...",
  "size": 15,
  "deletable": false,
  "epochs": 365
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Data is required"
}
```

---

### GET `/api/walrus/read/:blobId`

Read a blob from Walrus storage.

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `blobId` (string, required) - The blob ID to read

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "blobId": "0xdef456...",
  "data": "SGVsbG8sIFdhbHJ1cyE=",
  "size": 15
}
```

**Note:** Data is returned as base64-encoded string.

---

### GET `/api/walrus/status/:blobId`

Get blob status from Sui blockchain.

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `blobId` (string, required) - The blob ID

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "blobId": "0xdef456...",
  "certified": true,
  "deletable": false,
  "expiryEpoch": 1234,
  "eventId": "0x789...xyz"
}
```

---

### POST `/api/walrus/contribution`

Store a contribution on Walrus (ODX-specific wrapper).

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "ip_token_id": "0x123...abc",
  "engagement_type": "rating",
  "user_wallet": "0x6df...",
  "signature": "0xabc123...",
  "timestamp": 1736629200000,
  "rating": 9
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "contribution": {
    "ip_token_id": "0x123...abc",
    "engagement_type": "rating",
    "rating": 9,
    "user_wallet": "0x6df...",
    "signature": "0xabc123...",
    "timestamp": 1736629200000,
    "walrus_cid": "bafybeigdyrzt5sfp7...",
    "blobId": "0xdef456..."
  }
}
```

**Note:** This endpoint stores the contribution but does NOT index it. Use `/api/oracle/contributions` to store and index.

---

### GET `/api/walrus/contribution/:blobId`

Read a contribution by blob ID.

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `blobId` (string, required) - The blob ID

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "contribution": {
    "ip_token_id": "0x123...abc",
    "engagement_type": "rating",
    "rating": 9,
    "user_wallet": "0x6df...",
    "signature": "0xabc123...",
    "timestamp": 1736629200000,
    "walrus_cid": "bafybeigdyrzt5sfp7..."
  }
}
```

---

## Metrics Endpoints

### GET `/api/metrics`

Get all service metrics.

**Headers:**
```
Content-Type: application/json
```

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "timestamp": "2025-01-13T14:30:00.000Z",
  "service": {
    "name": "ODX Oracle Service",
    "version": "1.0.0",
    "startTime": "2025-01-13T10:00:00.000Z",
    "uptime": 16200
  },
  "system": {
    "uptime": 16200,
    "uptimeFormatted": "4h 30m 0s",
    "memory": {
      "rss": 52428800,
      "rssFormatted": "50 MB",
      "heapTotal": 20971520,
      "heapTotalFormatted": "20 MB",
      "heapUsed": 15728640,
      "heapUsedFormatted": "15 MB",
      "usagePercent": 75
    },
    "platform": {
      "node": "v20.19.34",
      "platform": "win32",
      "arch": "x64",
      "pid": 14288
    }
  },
  "walrus": {
    "operations": {
      "store": { "count": 45, "averageDuration": 1250 },
      "read": { "count": 120, "averageDuration": 850 },
      "status": { "count": 30, "averageDuration": 600 },
      "errors": 2
    },
    "config": {
      "context": "testnet",
      "configPath": "~/.config/walrus/client_config.yaml"
    }
  },
  "sui": {
    "network": "testnet",
    "rpcUrl": "https://fullnode.testnet.sui.io:443",
    "networkInfo": {
      "chainId": "4c78adac",
      "latestCheckpoint": "12345678",
      "referenceGasPrice": "1000"
    }
  },
  "oracle": {
    "operations": {
      "contributionsQueried": 500,
      "contributionsStored": 45,
      "metricsCalculated": 12,
      "onChainUpdates": 3,
      "errors": 1
    },
    "performance": {
      "query": { "count": 50, "averageDuration": 250 },
      "aggregate": { "count": 12, "averageDuration": 1500 },
      "update": { "count": 3, "averageDuration": 5000 }
    },
    "config": {
      "updateInterval": 3600000,
      "updateIntervalFormatted": "1h",
      "oracleObjectId": "configured",
      "adminCapId": "configured",
      "packageId": "configured"
    }
  },
  "contributions": {
    "indexed": {
      "totalContributions": 500,
      "uniqueIPTokens": 15,
      "averagePerToken": 33
    },
    "verification": {
      "verified": 495,
      "failed": 5,
      "successRate": 99
    },
    "aggregation": {
      "performed": 12,
      "errors": 0
    }
  }
}
```

---

### GET `/api/metrics/system`

Get system metrics only.

**Headers:**
```
Content-Type: application/json
```

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "uptime": 16200,
    "uptimeFormatted": "4h 30m 0s",
    "memory": { ... },
    "cpu": { ... },
    "platform": { ... }
  }
}
```

---

### GET `/api/metrics/walrus`

Get Walrus metrics only.

**Headers:**
```
Content-Type: application/json
```

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "operations": { ... },
    "config": { ... }
  }
}
```

---

### GET `/api/metrics/sui`

Get Sui network metrics only.

**Headers:**
```
Content-Type: application/json
```

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "network": "testnet",
    "rpcUrl": "https://fullnode.testnet.sui.io:443",
    "networkInfo": { ... }
  }
}
```

---

### GET `/api/metrics/oracle`

Get Oracle metrics only.

**Headers:**
```
Content-Type: application/json
```

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "operations": { ... },
    "performance": { ... },
    "config": { ... }
  }
}
```

---

### GET `/api/metrics/contributions`

Get contribution metrics only.

**Headers:**
```
Content-Type: application/json
```

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "indexed": { ... },
    "verification": { ... },
    "aggregation": { ... }
  }
}
```

---

## Contract Endpoints

The contract endpoints provide direct interaction with the ODX smart contracts on Sui. These endpoints require an admin keypair configured via `ADMIN_PRIVATE_KEY` environment variable for write operations.

**Important Notes:**
- **IP Token Creation**: Only **ADMIN** can create IP tokens. Regular users cannot mint/create IP tokens. The `create_ip_token` function requires `AdminCap` which is held only by the admin.
- **Write Operations**: All write operations (POST, PUT) require the `ADMIN_PRIVATE_KEY` to be set in the backend `.env` file.
- **Read Operations**: Read operations (GET) do not require authentication and can be called by anyone.

### Token Routes

#### POST `/api/contract/tokens`

Create a new IP token.

**⚠️ ADMIN ONLY**: This endpoint requires admin privileges. Only users with `AdminCap` can create IP tokens. Regular users cannot create IP tokens.

**Note:** This endpoint uses the backend's admin keypair to sign transactions. For frontend wallet-based token creation (where the admin connects their wallet), use the frontend contract utilities (`lib/utils/contract.ts`) which will trigger wallet popups for transaction signing.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Chainsaw Man",
  "symbol": "CSM",
  "description": "A young man who merges with a dog-like devil",
  "category": 0,
  "reservePoolSize": 50000
}
```

**Request Body Fields:**
- `name` (string, required) - Token name
- `symbol` (string, required) - Token symbol/ticker
- `description` (string, required) - Token description
- `category` (number, required) - Category: 0=anime, 1=manga, 2=manhwa
- `reservePoolSize` (number, required) - Reserve pool size for contributor rewards (must be < 200000)

**Response (200 OK):**
```json
{
  "success": true,
  "digest": "0xabc123...",
  "tokenId": "0xdef456...",
  "result": { ... }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Missing required fields: name, symbol, description, category, reservePoolSize"
}
```

**Error Response (403 Forbidden - if not admin):**
```json
{
  "success": false,
  "error": "Admin keypair not configured. Set ADMIN_PRIVATE_KEY in .env"
}
```

---

#### GET `/api/contract/tokens`

Get all IP tokens from the registry.

**Headers:** None required

**Query Parameters:**
- `detailed` (boolean, optional) - If `true`, returns full token information for each token. Default: `false` (returns only token IDs)

**Request:** None

**Response (200 OK) - Token IDs only:**
```json
{
  "success": true,
  "count": 2,
  "tokens": ["0xabc123...", "0xdef456..."]
}
```

**Response (200 OK) - With detailed=true:**
```json
{
  "success": true,
  "count": 2,
  "tokens": [
    {
      "id": "0xabc123...",
      "name": "Chainsaw Man",
      "symbol": "CSM",
      "totalSupply": 200000,
      "reservePool": 50000,
      "circulatingSupply": 150000
    },
    {
      "id": "0xdef456...",
      "name": "One Piece",
      "symbol": "OP",
      "totalSupply": 200000,
      "reservePool": 60000,
      "circulatingSupply": 140000
    }
  ]
}
```

**Note:** 
- By default, returns only token IDs for faster response
- Use `?detailed=true` to get full token information (slower but more complete)
- Token IDs are parsed from the on-chain registry

---

#### GET `/api/contract/tokens/count`

Get the total number of IP tokens in the registry.

**Headers:** None required

**Request:** None

**Response (200 OK):**
```json
{
  "success": true,
  "count": 5
}
```

---

#### GET `/api/contract/tokens/:tokenId`

Get information for a specific IP token.

**Path Parameters:**
- `tokenId` (string, required) - IP token ID

**Response (200 OK):**
```json
{
  "success": true,
  "tokenId": "0xabc123...",
  "info": {
    "name": "Chainsaw Man",
    "symbol": "CSM",
    "totalSupply": 200000,
    "reservePool": 50000,
    "circulatingSupply": 100000
  }
}
```

---

#### PUT `/api/contract/tokens/:tokenId/reserve`

Update the reserve pool size for an IP token.

**Path Parameters:**
- `tokenId` (string, required) - IP token ID

**Request Body:**
```json
{
  "newReserveSize": 60000
}
```

**Request Body Fields:**
- `newReserveSize` (number, required) - New reserve pool size

**Response (200 OK):**
```json
{
  "success": true,
  "tokenId": "0xabc123...",
  "digest": "0xdef456...",
  "result": { ... }
}
```

---

### Marketplace Routes

#### POST `/api/contract/marketplace/buy`

Create a buy order for IP tokens.

**Request Body:**
```json
{
  "ipTokenId": "0xabc123...",
  "price": 1500000000,
  "quantity": 100,
  "paymentCoinId": "0xdef456..."
}
```

**Request Body Fields:**
- `ipTokenId` (string, required) - IP token ID to buy
- `price` (number, required) - Price per token (scaled by 1e9)
- `quantity` (number, required) - Quantity to buy
- `paymentCoinId` (string, required) - Payment coin object ID

**Response (200 OK):**
```json
{
  "success": true,
  "digest": "0xabc123...",
  "orderId": "0xdef456...",
  "result": { ... }
}
```

---

#### POST `/api/contract/marketplace/sell`

Create a sell order for IP tokens.

**Request Body:**
```json
{
  "ipTokenId": "0xabc123...",
  "price": 1500000000,
  "quantity": 100
}
```

**Request Body Fields:**
- `ipTokenId` (string, required) - IP token ID to sell
- `price` (number, required) - Price per token (scaled by 1e9)
- `quantity` (number, required) - Quantity to sell

**Response (200 OK):**
```json
{
  "success": true,
  "digest": "0xabc123...",
  "orderId": "0xdef456...",
  "result": { ... }
}
```

---

#### POST `/api/contract/marketplace/orders/:orderId/execute-buy`

Execute a buy order.

**Path Parameters:**
- `orderId` (string, required) - Order ID

**Response (200 OK):**
```json
{
  "success": true,
  "orderId": "0xabc123...",
  "digest": "0xdef456...",
  "result": { ... }
}
```

---

#### POST `/api/contract/marketplace/orders/:orderId/execute-sell`

Execute a sell order.

**Path Parameters:**
- `orderId` (string, required) - Order ID

**Response (200 OK):**
```json
{
  "success": true,
  "orderId": "0xabc123...",
  "digest": "0xdef456...",
  "result": { ... }
}
```

---

#### POST `/api/contract/marketplace/orders/:orderId/cancel`

Cancel an order.

**Path Parameters:**
- `orderId` (string, required) - Order ID

**Response (200 OK):**
```json
{
  "success": true,
  "orderId": "0xabc123...",
  "digest": "0xdef456...",
  "result": { ... }
}
```

---

### Oracle Routes

#### POST `/api/contract/oracle/initialize-price`

Initialize price data for a new IP token.

**Request Body:**
```json
{
  "ipTokenId": "0xabc123...",
  "basePrice": 1000000000
}
```

**Request Body Fields:**
- `ipTokenId` (string, required) - IP token ID
- `basePrice` (number, required) - Base price in SUI (scaled by 1e9)

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0xabc123...",
  "digest": "0xdef456...",
  "result": { ... }
}
```

---

#### POST `/api/contract/oracle/update-metrics`

Update engagement metrics for an IP token.

**Request Body:**
```json
{
  "ipTokenId": "0xabc123...",
  "averageRating": 850,
  "totalContributors": 1200,
  "totalEngagements": 5200,
  "predictionAccuracy": 7500,
  "growthRate": 2500
}
```

**Request Body Fields:**
- `ipTokenId` (string, required) - IP token ID
- `averageRating` (number, required) - Average rating (scaled by 100, e.g., 850 = 8.5/10)
- `totalContributors` (number, required) - Total number of contributors
- `totalEngagements` (number, required) - Total engagement count
- `predictionAccuracy` (number, required) - Prediction accuracy (0-10000)
- `growthRate` (number, required) - Growth rate percentage (scaled by 100, e.g., 2500 = 25%)

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0xabc123...",
  "digest": "0xdef456...",
  "result": { ... }
}
```

---

#### GET `/api/contract/oracle/price/:ipTokenId`

Get current price for an IP token.

**Path Parameters:**
- `ipTokenId` (string, required) - IP token ID

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0xabc123...",
  "price": 1500000000
}
```

**Note:** Price is returned in SUI scaled by 1e9. Returns `null` if price not initialized.

---

#### GET `/api/contract/oracle/metrics/:ipTokenId`

Get engagement metrics for an IP token.

**Path Parameters:**
- `ipTokenId` (string, required) - IP token ID

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0xabc123...",
  "metrics": {
    "average_rating": 850,
    "total_contributors": 1200,
    "total_engagements": 5200,
    "prediction_accuracy": 7500,
    "growth_rate": 2500
  }
}
```

**Note:** Returns `null` if metrics not initialized.

---

#### POST `/api/contract/oracle/recalculate/:ipTokenId`

Recalculate price for an IP token based on current metrics.

**Path Parameters:**
- `ipTokenId` (string, required) - IP token ID

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0xabc123...",
  "digest": "0xdef456...",
  "result": { ... }
}
```

---

### Rewards Routes

#### POST `/api/contract/rewards/register`

Register an engagement for reward tracking.

**Request Body:**
```json
{
  "ipTokenId": "0xabc123...",
  "userAddress": "0x6df...",
  "rating": 9,
  "engagementType": 0
}
```

**Request Body Fields:**
- `ipTokenId` (string, required) - IP token ID
- `userAddress` (string, required) - User wallet address
- `rating` (number, required) - Rating (0-10)
- `engagementType` (number, required) - Engagement type: 0=rating, 1=prediction, 2=vote, 3=review

**Response (200 OK):**
```json
{
  "success": true,
  "digest": "0xabc123...",
  "result": { ... }
}
```

**Note:** This endpoint currently requires a `create_engagement_data` helper function in the Move contract. See code comments for implementation details.

---

#### POST `/api/contract/rewards/distribute`

Distribute a reward to a contributor.

**Request Body:**
```json
{
  "ipTokenId": "0xabc123...",
  "userAddress": "0x6df...",
  "reason": 0
}
```

**Request Body Fields:**
- `ipTokenId` (string, required) - IP token ID
- `userAddress` (string, required) - User wallet address
- `reason` (number, required) - Reward reason: 0=early engagement, 1=prediction accuracy, 2=viral content, 3=network effect

**Response (200 OK):**
```json
{
  "success": true,
  "digest": "0xabc123...",
  "result": { ... }
}
```

---

#### GET `/api/contract/rewards/contributor/:ipTokenId/:userAddress`

Get contributor record for a specific user and IP token.

**Path Parameters:**
- `ipTokenId` (string, required) - IP token ID
- `userAddress` (string, required) - User wallet address

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0xabc123...",
  "userAddress": "0x6df...",
  "contributor": {
    "engagement_count": 5,
    "average_rating": 900,
    "prediction_accuracy": 8000,
    "total_rewards": 500,
    "is_early_contributor": true,
    "first_engagement": 1736629200000
  }
}
```

**Note:** Returns `null` if contributor record doesn't exist.

---

#### GET `/api/contract/rewards/contributors/:ipTokenId`

Get total contributor count for an IP token.

**Path Parameters:**
- `ipTokenId` (string, required) - IP token ID

**Response (200 OK):**
```json
{
  "success": true,
  "ipTokenId": "0xabc123...",
  "count": 1200
}
```

---

### Utility Routes

#### GET `/api/contract/objects/:objectId`

Get object details from Sui blockchain.

**Path Parameters:**
- `objectId` (string, required) - Sui object ID

**Response (200 OK):**
```json
{
  "success": true,
  "objectId": "0xabc123...",
  "object": {
    "data": { ... },
    "owner": { ... },
    "previousTransaction": "0xdef456...",
    "storageRebate": 1000000,
    "reference": { ... }
  }
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Not Found",
  "message": "The requested resource was not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Error message (only in development mode)",
  "stack": "Error stack trace (only in development mode)"
}
```

### 503 Service Unavailable
```json
{
  "status": "unhealthy",
  "error": "Service is currently unavailable"
}
```

---

## Root Endpoint

### GET `/`

Get basic service information.

**Headers:** None required

**Request:** None

**Response (200 OK):**
```json
{
  "name": "ODX Oracle Service",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "oracle": "/api/oracle",
    "metrics": "/api/metrics",
    "walrus": "/api/walrus",
    "contract": "/api/contract"
  }
}
```

---

## Example cURL Commands

### Health Check
```bash
curl http://localhost:3000/health
```

### Store Contribution
```bash
curl -X POST http://localhost:3000/api/oracle/contributions \
  -H "Content-Type: application/json" \
  -d '{
    "ip_token_id": "0x123...abc",
    "engagement_type": "rating",
    "user_wallet": "0x6df...",
    "signature": "0xabc123...",
    "timestamp": 1736629200000,
    "rating": 9
  }'
```

### Get Contributions
```bash
curl http://localhost:3000/api/oracle/contributions/0x123...abc?type=rating
```

### Get Metrics
```bash
curl http://localhost:3000/api/oracle/metrics/0x123...abc
```

### Store Blob on Walrus
```bash
curl -X POST http://localhost:3000/api/walrus/store \
  -H "Content-Type: application/json" \
  -d '{
    "data": "Hello, Walrus!",
    "deletable": false,
    "epochs": 365
  }'
```

### Create IP Token
```bash
curl -X POST http://localhost:3000/api/contract/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chainsaw Man",
    "symbol": "CSM",
    "description": "A young man who merges with a dog-like devil",
    "category": 0,
    "reservePoolSize": 50000
  }'
```

### Get All Tokens (IDs only)
```bash
curl http://localhost:3000/api/contract/tokens
```

### Get All Tokens (with full details)
```bash
curl http://localhost:3000/api/contract/tokens?detailed=true
```

### Get Token Count
```bash
curl http://localhost:3000/api/contract/tokens/count
```

### Get Token Info
```bash
curl http://localhost:3000/api/contract/tokens/0xabc123...
```

### Get Token Price
```bash
curl http://localhost:3000/api/contract/oracle/price/0xabc123...
```

### Update Engagement Metrics
```bash
curl -X POST http://localhost:3000/api/contract/oracle/update-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "ipTokenId": "0xabc123...",
    "averageRating": 850,
    "totalContributors": 1200,
    "totalEngagements": 5200,
    "predictionAccuracy": 7500,
    "growthRate": 2500
  }'
```

### Create Buy Order
```bash
curl -X POST http://localhost:3000/api/contract/marketplace/buy \
  -H "Content-Type: application/json" \
  -d '{
    "ipTokenId": "0xabc123...",
    "price": 1500000000,
    "quantity": 100,
    "paymentCoinId": "0xdef456..."
  }'
```

---

## Notes

1. **Port Discovery**: The server automatically finds an available port starting from 3000. Check server logs to see which port is actually being used.

2. **Timestamps**: All timestamps are in Unix milliseconds (e.g., `1736629200000`).

3. **Sui Addresses**: IP token IDs and wallet addresses should be in Sui address format (64 hex characters prefixed with `0x`).

4. **Blob IDs**: Walrus blob IDs are returned as Sui object IDs.

5. **Signature Verification**: Contributions must be signed with the user's wallet. The signature is verified using Sui's personal message signature verification.

6. **Metrics Scaling**: Some metrics are scaled by 100 for precision (e.g., `average_rating: 850` = 8.5/10, `growth_rate: 2500` = 25%).

7. **Development vs Production**: Error responses include stack traces only in development mode (`NODE_ENV=development`).

8. **Admin Keypair**: Contract write operations require `ADMIN_PRIVATE_KEY` to be set in the backend `.env` file. The private key should be base64-encoded. Get your private key using `node scripts/get-private-key.js` and encode it: `echo -n "your-private-key-hex" | xxd -r -p | base64`.

9. **Price Scaling**: All prices are scaled by 1e9 for precision (e.g., `1500000000` = 1.5 SUI).

10. **Metrics Scaling**: Engagement metrics use scaling:
    - `averageRating`: Scaled by 100 (e.g., 850 = 8.5/10)
    - `growthRate`: Scaled by 100 (e.g., 2500 = 25%)
    - `predictionAccuracy`: 0-10000 scale

