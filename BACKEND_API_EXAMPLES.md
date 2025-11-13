# Backend API Interaction Examples

## Quick Start

### 1. Get Your Private Key

You have two keys available:
- `lucid-hematite`
- `blissful-phenacite`

**Export your private key:**
```bash
sui keytool export lucid-hematite --json
```

Copy the `value` field from the JSON output and add to `backend/.env`:
```env
ADMIN_PRIVATE_KEY=<paste-the-value-here>
```

### 2. Start the Backend Server

```bash
cd backend
npm start
```

### 3. Test the API

#### Using curl:

```bash
# Get all tokens
curl http://localhost:3000/api/contract/tokens

# Get price for an IP token
curl http://localhost:3000/api/contract/oracle/price/0x123...

# Get object details
curl http://localhost:3000/api/contract/objects/0x4565bda97f21e43a7fa4f3a9e07ac400ab448fc1f5044a5422fd698b8ceb6936
```

#### Using Node.js script:

```bash
cd backend
node scripts/simple-api-example.js
```

#### Using the test script:

```bash
cd backend
node scripts/test-contract.js test-config
node scripts/test-contract.js get-all-tokens
node scripts/test-contract.js get-price <ipTokenId>
```

## Example API Calls

### Read Operations (No Auth Needed)

```javascript
// Get all tokens
fetch('http://localhost:3000/api/contract/tokens')
  .then(res => res.json())
  .then(data => console.log(data));

// Get price
fetch('http://localhost:3000/api/contract/oracle/price/0x123...')
  .then(res => res.json())
  .then(data => console.log(data));

// Get engagement metrics
fetch('http://localhost:3000/api/contract/oracle/metrics/0x123...')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Write Operations (Requires Admin Keypair)

```javascript
// Update engagement metrics
fetch('http://localhost:3000/api/contract/oracle/update-metrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ipTokenId: '0x123...',
    averageRating: 850,
    totalContributors: 150,
    totalEngagements: 500,
    predictionAccuracy: 7500,
    growthRate: 2500
  })
})
  .then(res => res.json())
  .then(data => console.log(data));

// Create IP token
fetch('http://localhost:3000/api/contract/tokens', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Chainsaw Man',
    symbol: 'CSM',
    description: 'Chainsaw Man IP token',
    category: 0, // 0=anime, 1=manga, 2=manhwa
    reservePoolSize: 50000
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## Available Endpoints

See `backend/CONTRACT_SERVICE.md` for full documentation of all endpoints.

## Troubleshooting

- **"Admin keypair not configured"**: Set `ADMIN_PRIVATE_KEY` in `backend/.env`
- **"Connection refused"**: Make sure backend server is running
- **"Insufficient gas"**: Make sure your wallet has SUI tokens for gas
