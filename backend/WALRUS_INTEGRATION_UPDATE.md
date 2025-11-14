# Walrus Integration Update - Based on Official Documentation

## Overview

Updated the Walrus integration to match the official documentation from:
- https://docs.wal.app/usage/client-cli
- https://docs.wal.app/dev-guide/dev-operations
- https://docs.wal.app/usage/json-api

## Key Changes Made

### 1. Store Command Updates

**Before:**
```bash
walrus store <file> [--deletable] [--epochs <n>]
```

**After (per official docs):**
```bash
walrus store <file> --epochs <n> [--permanent|--deletable]
```

**Changes:**
- ✅ `--epochs` is now **mandatory** (was optional)
- ✅ Since v1.33, blobs are **deletable by default**
- ✅ Use `--permanent` flag for non-deletable blobs (contributions should be permanent)
- ✅ Default epochs set to 365 (1 year) if not specified

### 2. Read Command Updates

**Before:**
```bash
walrus read <blob-id> --output <file>
```

**After (per official docs):**
```bash
walrus read <blob-id> --out <file>
```

**Changes:**
- ✅ Changed `--output` to `--out` (official flag name)

### 3. Blob Status Command Updates

**Before:**
```bash
walrus blob-status <blob-id>
```

**After (per official docs):**
```bash
walrus blob-status --blob-id <blob-id>
```

**Changes:**
- ✅ Added `--blob-id` flag (official format)

### 4. Blob ID Extraction Improvements

**Updates:**
- ✅ Added support for `newlyCreated.blobObject.blobId` format (from store command response)
- ✅ Improved base64 blob ID pattern matching (Walrus uses base64-encoded IDs)
- ✅ Better error messages with full result logging

### 5. Blob Status Parsing Improvements

**Updates:**
- ✅ Added `permanent` field to status
- ✅ Added `endEpoch` field (alias for `expiryEpoch`)
- ✅ Added `objectId` field extraction
- ✅ Better handling of certified epoch information

### 6. Contribution Storage

**Updates:**
- ✅ Contributions now use `--permanent` flag (non-deletable)
- ✅ Default to 365 epochs (1 year) storage
- ✅ Properly handles v1.33+ default behavior (deletable by default)

## Command Reference (Official)

### Store Blob
```bash
walrus store <FILES> --epochs <EPOCHS> [--permanent|--deletable] [--force]
```
- `--epochs` is **mandatory**
- `--permanent`: Non-deletable blob (default for contributions)
- `--deletable`: Deletable blob (default since v1.33)
- `--force`: Overwrite existing blob

### Read Blob
```bash
walrus read <blob_id> [--out <OUT>] [--rpc-url <URL>]
```
- `--out`: Output file path
- `--rpc-url`: Alternative RPC URL

### Blob Status
```bash
walrus blob-status --blob-id <BLOB_ID>
walrus blob-status --file <FILE>
```
- Returns certification status, expiry epoch, deletable status

### JSON Mode (Alternative)
```bash
walrus json '{
  "config": "path/to/client_config.yaml",
  "command": {
    "store": {
      "files": ["file1", "file2"],
      "epochs": 100
    }
  }
}'
```

## Implementation Details

### Updated Methods

1. **`storeBlob()`**
   - Now requires `--epochs` flag (mandatory)
   - Uses `--permanent` for contributions
   - Default epochs: 365

2. **`readBlob()`**
   - Uses `--out` instead of `--output`

3. **`getBlobStatus()`**
   - Uses `--blob-id` flag format

4. **`storeContribution()`**
   - Uses `permanent: true` option
   - Stores for 365 epochs by default

5. **`extractBlobId()`**
   - Handles `newlyCreated` response format
   - Better base64 pattern matching
   - Improved error messages

6. **`parseBlobStatus()`**
   - Added `permanent` field
   - Added `endEpoch` field
   - Added `objectId` extraction

### New Method

7. **`executeWalrusJSON()`**
   - Alternative JSON mode execution
   - Structured command format
   - Useful for complex operations

## Testing

### Test Store (Permanent Blob)
```bash
curl -X POST http://localhost:3000/api/walrus/store \
  -H "Content-Type: application/json" \
  -d '{
    "data": "test contribution data",
    "permanent": true,
    "epochs": 365
  }'
```

### Test Store Contribution
```bash
curl -X POST http://localhost:3000/api/oracle/contributions \
  -H "Content-Type: application/json" \
  -d '{
    "ip_token_id": "0x123...",
    "engagement_type": "rating",
    "rating": 9,
    "user_wallet": "0xabc...",
    "signature": "0xdef...",
    "timestamp": 1736629200000
  }'
```

## Compatibility Notes

### Walrus Version Requirements
- **v1.33+**: Blobs are deletable by default
- **v1.29+**: Quilt support available
- **All versions**: `--epochs` flag is mandatory for store command

### Breaking Changes from Previous Implementation
1. `--epochs` is now mandatory (was optional)
2. Blobs are deletable by default (need `--permanent` for contributions)
3. `--output` changed to `--out` for read command
4. `blob-status` requires `--blob-id` flag

## Next Steps

1. ✅ Update command formats to match official docs
2. ✅ Add permanent flag support
3. ✅ Improve blob ID extraction
4. ✅ Enhance status parsing
5. ⏳ Test with real Walrus CLI
6. ⏳ Verify blob storage and retrieval
7. ⏳ Test contribution flow end-to-end

## References

- Official Docs: https://docs.wal.app/usage/client-cli
- Dev Guide: https://docs.wal.app/dev-guide/dev-operations
- JSON API: https://docs.wal.app/usage/json-api
- Sui Integration: https://docs.wal.app/dev-guide/sui-struct

