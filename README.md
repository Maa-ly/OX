# ODX Oracle Service - Backend

Full-featured Node.js/Express backend service that bridges Walrus decentralized storage to Sui smart contracts. This service reads user contributions from Walrus, verifies signatures, aggregates metrics, and updates on-chain data.

## Features

- **RESTful API** - Express.js server with comprehensive endpoints
- **Walrus Integration** - Complete Walrus operations (store, read, certify, query)
- **Contribution Indexing** - Index contributions by IP token ID for fast queries
- **Signature Verification** - Verify wallet signatures on all contributions
- **Metrics Aggregation** - Aggregate all contribution types into comprehensive metrics
- **Sui Integration** - Update smart contracts on Sui blockchain
- **Scheduled Updates** - Automatic periodic updates using cron
- **Error Handling** - Comprehensive error handling and logging
- **Health Checks** - Health check endpoints for monitoring

## Prerequisites

### 1. Install pnpm

```bash
npm install -g pnpm
```

### 2. Sui Wallet Setup

You need a Sui wallet configured for testnet:

```bash
# Check if Sui CLI is installed
sui --version

# Check wallet configuration
sui client envs

# Make sure testnet is active
sui client switch --env testnet

# Check you have SUI tokens for gas
sui client gas
```

### 3. Walrus CLI Installation

Walrus CLI is installed via `suiup`:

```bash
# Install Walrus for testnet
suiup install walrus@testnet

# Or use npm script
pnpm run install:walrus

# Verify installation
~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus --version
```

**Note:** The Walrus binary is located at `~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus`. You may need to add this to your PATH or create a symlink:

```bash
# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/share/suiup/binaries/testnet/walrus-v1.37.0:$PATH"

# Or create symlink
ln -s ~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus ~/.local/bin/walrus
```

### 4. Walrus Configuration

Configuration file is located at `~/.config/walrus/client_config.yaml` and should already be set up with testnet configuration.

Verify configuration:

```bash
cat ~/.config/walrus/client_config.yaml
```

The configuration should have:
- `system_object` for testnet: `0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af`
- `staking_object` for testnet: `0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3`
- `default_context: testnet`

### 5. WAL Tokens

You need WAL tokens on testnet to pay for storage. Get testnet WAL from the Walrus faucet or testnet exchange.

## Installation

### Install Dependencies with pnpm

```bash
cd backend
pnpm install
```

### Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Sui Network
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Walrus Configuration
WALRUS_CONFIG_PATH=~/.config/walrus/client_config.yaml
WALRUS_CONTEXT=testnet
WALRUS_BINARY_PATH=~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus

# Oracle Configuration (set after smart contract deployment)
ORACLE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000
ADMIN_CAP_ID=0x0000000000000000000000000000000000000000000000000000000000000000
PACKAGE_ID=0x0000000000000000000000000000000000000000000000000000000000000000

# Update Interval (in milliseconds)
UPDATE_INTERVAL=3600000  # 1 hour

# Database (optional, for caching)
DATABASE_URL=sqlite://./data/oracle.db

# Server
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

## Usage

### Development

```bash
pnpm run dev
```

### Production

```bash
pnpm start
```

### Testing

```bash
pnpm test
```

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with service status

### Walrus Operations
- `POST /api/walrus/store` - Store a blob on Walrus
- `GET /api/walrus/read/:blobId` - Read a blob from Walrus
- `GET /api/walrus/status/:blobId` - Get blob status from Sui
- `POST /api/walrus/contribution` - Store a contribution (ODX-specific)
- `GET /api/walrus/contribution/:blobId` - Read a contribution by blob ID

### Oracle Operations
- `GET /api/oracle/contributions/:ipTokenId` - Get contributions for an IP token
- `POST /api/oracle/contributions` - Store a new contribution
- `POST /api/oracle/verify` - Verify a contribution signature
- `GET /api/oracle/metrics/:ipTokenId` - Get aggregated metrics for an IP token
- `POST /api/oracle/update/:ipTokenId` - Update metrics on-chain for an IP token
- `POST /api/oracle/update-all` - Update metrics for all IP tokens

### Metrics
- `GET /api/metrics` - Get service metrics

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Express server setup
│   ├── config/
│   │   └── config.js          # Configuration loader
│   ├── routes/
│   │   ├── health.js          # Health check routes
│   │   ├── oracle.js          # Oracle operation routes
│   │   ├── metrics.js         # Metrics routes
│   │   └── walrus.js          # Walrus operation routes
│   ├── services/
│   │   ├── walrus.js          # Walrus operations (store, read, certify)
│   │   ├── walrus-indexer.js  # Contribution indexing service
│   │   ├── verification.js    # Signature verification service
│   │   ├── aggregation.js     # Metrics aggregation service
│   │   ├── sui.js             # Sui smart contract interface
│   │   └── scheduler.js       # Scheduled update service
│   ├── middleware/
│   │   ├── errorHandler.js    # Error handling middleware
│   │   └── notFoundHandler.js # 404 handler
│   └── utils/
│       └── logger.js          # Logging utilities
├── tests/                     # Test files
├── data/                      # Local data storage (gitignored)
├── .env                       # Environment variables (gitignored)
├── .env.example               # Example environment file
├── package.json
├── pnpm-workspace.yaml        # pnpm workspace config
├── .npmrc                     # pnpm configuration
└── README.md
```

## Walrus Integration

This backend implements the complete Walrus integration as per the [Walrus Developer Guide](https://docs.wal.app/dev-guide/dev-guide.html):

### Operations Implemented

1. **Store** - Store blobs on Walrus using the Walrus CLI
2. **Read** - Read blobs from Walrus storage nodes
3. **Certify Availability** - Check blob certification status on Sui
4. **Query** - Query contributions by IP token ID using indexing

### Components Used

- **Walrus Client Binary** - For store/read operations
- **Sui Client** - For reading blob metadata and certification status
- **Contribution Indexer** - Maintains index of contributions by IP token ID

### Data Flow

1. **Store Contribution**: Frontend → Backend → Walrus (store blob) → Index
2. **Query Contributions**: Backend → Index → Walrus (read blobs) → Return
3. **Update Metrics**: Backend → Query contributions → Verify → Aggregate → Sui

## Documentation

- [Walrus Integrator Guide](../WALRUS_INTEGRATOR_GUIDE.md) - Complete technical guide
- [Walrus Integration Overview](../WALRUS_INTEGRATION.md) - Why Walrus is critical
- [Walrus Developer Guide](https://docs.wal.app/dev-guide/dev-guide.html) - Official Walrus docs
- [Walrus Operations](https://docs.wal.app/dev-guide/dev-operations.html) - Operations reference
- [Walrus Components](https://docs.wal.app/dev-guide/components.html) - Component architecture
- [Sui Structures](https://docs.wal.app/dev-guide/sui-struct.html) - Sui integration

## Resources

- [Walrus Setup Guide](https://docs.wal.app/usage/setup.html)
- [Sui TypeScript SDK](https://docs.sui.io/build/sui-typescript-sdk)
- [Walrus GitHub](https://github.com/MystenLabs/walrus)

## Next Steps

1. Set up environment variables
2. Deploy smart contracts and get object IDs
3. Test Walrus store/read operations
4. Test contribution indexing
5. Test signature verification
6. Test metrics aggregation
7. Test Sui contract updates
8. Set up scheduler for periodic updates

## Troubleshooting

### Walrus binary not found

Make sure Walrus is installed and the path is correct in `.env`:

```bash
# Check if binary exists
ls -la ~/.local/share/suiup/binaries/testnet/walrus-v1.37.0/walrus

# Update WALRUS_BINARY_PATH in .env if needed
```

### Configuration file not found

Download the configuration file:

```bash
curl --create-dirs https://docs.wal.app/setup/client_config.yaml -o ~/.config/walrus/client_config.yaml
```

### Insufficient WAL tokens

Get testnet WAL tokens from the Walrus faucet or testnet exchange.

## License

MIT