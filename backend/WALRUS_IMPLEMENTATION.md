# Walrus Implementation - Complete

## Implementation Status: COMPLETE

All Walrus operations are now fully implemented based on the official documentation:
- https://docs.wal.app/usage/interacting.html
- https://docs.wal.app/dev-guide/dev-operations.html

## How We Interact with Walrus

### Method: Walrus CLI (Primary)

We use the Walrus CLI binary via `child_process.exec()` to execute commands.

**Reference:** https://docs.wal.app/usage/interacting.html#using-the-client-cli

### Implemented Operations

#### 1. Store Blob
```javascript
await walrusService.storeBlob(data, { deletable: false, epochs: 365 })
```
**CLI Command:** `walrus store <file> [--deletable] [--epochs <n>]`
- Writes data to temp file
- Executes Walrus CLI command
- Parses blob ID from output
- Returns blob information

#### 2. Read Blob
```javascript
const data = await walrusService.readBlob(blobId)
```
**CLI Command:** `walrus read <blob-id> --output <file>`
- Executes Walrus CLI command
- Reads data from output file
- Returns Buffer

#### 3. Get Blob Status
```javascript
const status = await walrusService.getBlobStatus(blobId)
```
**CLI Command:** `walrus blob-status <blob-id>`
- Executes Walrus CLI command
- Parses status information
- Returns status object (certified, deletable, expiryEpoch, eventId)

#### 4. Get System Info
```javascript
const info = await walrusService.getInfo()
```
**CLI Command:** `walrus info`
- Gets Walrus system information
- Returns system object ID, epoch duration, network info

#### 5. Store Contribution (ODX-specific)
```javascript
const stored = await walrusService.storeContribution(contribution)
```
- Converts contribution to JSON
- Stores on Walrus (non-deletable, 365 epochs)
- Adds blob ID to contribution
- Returns contribution with blob ID

#### 6. Read Contribution
```javascript
const contribution = await walrusService.readContribution(blobId)
```
- Reads blob from Walrus
- Parses JSON
- Returns contribution object

## Command Execution Details

### Base Command Structure
```bash
walrus --config <config-path> --context <context> <command> [options] [--json]
```

### JSON Output
All commands support `--json` flag for structured output:
- Automatically parsed when available
- Falls back to text parsing if JSON not available

### Error Handling
- Timeout: 60 seconds default
- Buffer: 10MB max
- Temp files: Automatically cleaned up
- Errors: Logged and re-thrown with context

## Integration Points

### 1. WalrusService (`src/services/walrus.js`)
**Status:** Complete
- All core operations implemented
- Metrics tracking integrated
- Error handling comprehensive
- Temp file management

### 2. WalrusIndexerService (`src/services/walrus-indexer.js`)
**Status:** Complete
- Maintains index of contributions by IP token ID
- Uses WalrusService to read contributions
- Filters by type and time range
- Caches metadata

### 3. API Routes (`src/routes/walrus.js`)
**Status:** Complete
- All endpoints functional
- Proper error handling
- JSON responses

### 4. Oracle Routes (`src/routes/oracle.js`)
**Status:** Complete
- Uses WalrusService and IndexerService
- Metrics tracking integrated
- Full workflow: store → index → query → verify → aggregate

## Data Flow

### Storing a Contribution
```
1. Frontend → POST /api/oracle/contributions
2. walrusService.storeContribution(contribution)
   → Convert to JSON
   → walrusService.storeBlob(jsonData)
     → Write to temp file
     → Execute: walrus store <file> --epochs 365
     → Parse blob ID
     → Clean up temp file
3. indexerService.indexContribution(ipTokenId, blobId, metadata)
   → Add to in-memory index
   → Cache metadata
4. Return contribution with blob ID
```

### Querying Contributions
```
1. Frontend → GET /api/oracle/contributions/:ipTokenId
2. indexerService.queryContributionsByIP(ipTokenId)
   → Get blob IDs from index
   → Filter by type/time if specified
3. For each blob ID:
   → walrusService.readContribution(blobId)
     → walrusService.readBlob(blobId)
       → Execute: walrus read <blob-id> --output <file>
       → Read file
       → Parse JSON
4. Return array of contributions
```

### Updating Metrics
```
1. Frontend → POST /api/oracle/update/:ipTokenId
2. Query contributions (as above)
3. Verify signatures
4. Aggregate metrics
5. Update Sui smart contract
```

## Configuration

### Required
- `WALRUS_BINARY_PATH` - Path to Walrus CLI binary
- `WALRUS_CONFIG_PATH` - Path to Walrus config file
- `WALRUS_CONTEXT` - Context/network (testnet/mainnet)

### Defaults
- Binary: `~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus`
- Config: `~/.config/walrus/client_config.yaml`
- Context: `testnet`

## Future Enhancements

### Option 1: Use TypeScript SDK (if available)
If `@mysten/walrus` SDK becomes available:
- Replace CLI calls with SDK methods
- Better error handling
- Type safety
- No temp files needed

### Option 2: Use HTTP API
If aggregator/publisher HTTP API is available:
- Faster (no process spawning)
- Better for high-volume operations
- Requires aggregator URL configuration

### Option 3: Use JSON API
If Walrus client JSON API is available:
- Programmatic interface
- Better integration
- Requires daemon running

## Testing

### Test Store Operation
```bash
curl -X POST http://localhost:3000/api/walrus/store \
  -H "Content-Type: application/json" \
  -d '{"data": "test data", "deletable": false}'
```

### Test Read Operation
```bash
curl http://localhost:3000/api/walrus/read/<blob-id>
```

### Test Store Contribution
```bash
curl -X POST http://localhost:3000/api/walrus/contribution \
  -H "Content-Type: application/json" \
  -d '{
    "ip_token_id": "0x123...",
    "engagement_type": "rating",
    "rating": 9,
    "user_wallet": "0xabc...",
    "timestamp": 1736629200
  }'
```

## Notes

1. **Temp Files**: All operations use temp files for data transfer. Files are automatically cleaned up.

2. **JSON Output**: Commands use `--json` flag when available for easier parsing.

3. **Error Handling**: Comprehensive error handling with proper cleanup and logging.

4. **Metrics**: All operations are tracked for performance monitoring.

5. **Indexing**: Contributions are indexed in-memory. For production, consider using a database.

6. **Querying**: Walrus doesn't support querying by metadata. We use an indexer service to maintain mappings.

