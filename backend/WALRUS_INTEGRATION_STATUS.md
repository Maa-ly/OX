# Current Walrus Integration Status

## How We're Currently Interacting with Walrus

### Current Implementation Status: INCOMPLETE

The Walrus service has placeholder methods but is missing the actual implementation.

## What's Currently Implemented

### 1. **WalrusService** (`src/services/walrus.js`)
**Status:** Incomplete - Only placeholder methods

**Current Methods:**
- `queryContributionsByIP()` - Returns empty array (not implemented)
- `queryByType()` - Wrapper around queryContributionsByIP
- `queryByTimeRange()` - Wrapper around queryContributionsByIP
- `getContribution()` - Throws "Not implemented yet" error

**Missing Methods (called by routes but don't exist):**
- `storeBlob()` - Called by `/api/walrus/store`
- `readBlob()` - Called by `/api/walrus/read/:blobId`
- `getBlobStatus()` - Called by `/api/walrus/status/:blobId`
- `storeContribution()` - Called by `/api/walrus/contribution`
- `readContribution()` - Called by `/api/walrus/contribution/:blobId`

### 2. **WalrusIndexerService** (`src/services/walrus-indexer.js`)
**Status:** Partially Implemented

**What it does:**
- Maintains in-memory index of contributions by IP token ID
- Maps: `ipTokenId -> [blobId1, blobId2, ...]`
- Caches blob metadata
- Filters by type and time range

**Limitation:**
- Depends on `walrusService.readContribution()` which doesn't exist yet
- Index is in-memory only (not persisted)

### 3. **API Routes** (`src/routes/walrus.js`)
**Status:** Defined but won't work

**Endpoints:**
- `POST /api/walrus/store` - Calls non-existent `storeBlob()`
- `GET /api/walrus/read/:blobId` - Calls non-existent `readBlob()`
- `GET /api/walrus/status/:blobId` - Calls non-existent `getBlobStatus()`
- `POST /api/walrus/contribution` - Calls non-existent `storeContribution()`
- `GET /api/walrus/contribution/:blobId` - Calls non-existent `readContribution()`

## How We SHOULD Be Interacting with Walrus

Based on Walrus documentation, we have three options:

### Option 1: Walrus CLI (Current Plan)
**Method:** Execute Walrus CLI binary via `child_process.exec()`

**Commands:**
- `walrus store <file>` - Store a blob
- `walrus read <blob-id>` - Read a blob
- `walrus blob-status <blob-id>` - Get blob status
- `walrus info` - Get system info

**Pros:**
- Simple to implement
- Uses official Walrus binary
- No additional dependencies

**Cons:**
- Requires file I/O (write temp files)
- Slower (spawns process each time)
- Harder to handle errors

### Option 2: Walrus HTTP API
**Method:** Make HTTP requests to Walrus aggregator/publisher endpoints

**Endpoints:**
- `POST /store` - Store blob
- `GET /read/:blobId` - Read blob
- `GET /status/:blobId` - Get status

**Pros:**
- Faster (no process spawning)
- Better error handling
- Can use HTTP libraries (axios, fetch)

**Cons:**
- Need to know aggregator/publisher URLs
- Requires network connectivity
- May need authentication

### Option 3: Walrus JSON API
**Method:** Use Walrus client's JSON API (if available)

**Pros:**
- Programmatic interface
- Better integration

**Cons:**
- May not be available
- Less documented

## Recommended Implementation

**Use Option 1 (CLI) for now** because:
1. We already have the binary installed
2. It's the most documented approach
3. We can switch to HTTP API later if needed

## What Needs to Be Implemented

### 1. Complete `WalrusService` class with:

```javascript
// Store operations
async storeBlob(data, options) {
  // 1. Write data to temp file
  // 2. Execute: walrus store <file> --config <config> --context <context>
  // 3. Parse blob ID from output
  // 4. Clean up temp file
  // 5. Return blob ID
}

async readBlob(blobId) {
  // 1. Execute: walrus read <blob-id> --output <temp-file>
  // 2. Read temp file
  // 3. Clean up temp file
  // 4. Return buffer
}

async getBlobStatus(blobId) {
  // 1. Execute: walrus blob-status <blob-id>
  // 2. Parse status from output
  // 3. Return status object
}

// Contribution-specific operations
async storeContribution(contribution) {
  // 1. Convert contribution to JSON
  // 2. Call storeBlob()
  // 3. Add blob ID to contribution
  // 4. Return contribution with blob ID
}

async readContribution(blobId) {
  // 1. Call readBlob()
  // 2. Parse JSON
  // 3. Return contribution object
}
```

### 2. Query Strategy for Contributions

**Current Problem:** Walrus doesn't have built-in querying by IP token ID.

**Solutions:**

**Option A: Index in Sui (Recommended)**
- Store blob ID → IP token ID mapping in Sui smart contract
- Query Sui for all blob IDs for an IP token
- Read blobs from Walrus using blob IDs

**Option B: Index Locally (Current)**
- Maintain local index (in-memory or database)
- Index contributions when stored
- Query index to get blob IDs
- Read blobs from Walrus

**Option C: Query All Blobs (Not Recommended)**
- Query Sui for all blob objects
- Filter by metadata
- Very slow and inefficient

## Current Flow (When Complete)

```
1. Store Contribution:
   Frontend → POST /api/oracle/contributions
   → walrusService.storeContribution()
   → walrus CLI: store blob
   → Get blob ID
   → indexerService.indexContribution()
   → Return blob ID

2. Query Contributions:
   GET /api/oracle/contributions/:ipTokenId
   → indexerService.queryContributionsByIP()
   → Get blob IDs from index
   → walrusService.readContribution() for each
   → Return contributions

3. Update Metrics:
   POST /api/oracle/update/:ipTokenId
   → Query contributions
   → Verify signatures
   → Aggregate metrics
   → Update Sui smart contract
```

## Next Steps

1. Implement missing methods in WalrusService
2. Test Walrus CLI commands
3. Implement proper error handling
4. Add metrics tracking
5. Consider switching to HTTP API for better performance
6. Implement persistent index (database)

