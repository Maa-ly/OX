#!/bin/bash
# Script to extract and save deployment information from publish output

cd "$(dirname "$0")"

echo "========================================="
echo "ODX Deployment Information Extractor"
echo "========================================="
echo ""

# Check if output file provided
if [ -n "$1" ]; then
    OUTPUT_FILE="$1"
    echo "Reading from: $OUTPUT_FILE"
elif [ -f "deployment_output.txt" ]; then
    OUTPUT_FILE="deployment_output.txt"
    echo "Using: $OUTPUT_FILE"
elif [ -f "final_deployment.txt" ]; then
    OUTPUT_FILE="final_deployment.txt"
    echo "Using: $OUTPUT_FILE"
else
    echo "No output file found. Please provide the publish output:"
    echo "  $0 <output_file>"
    echo ""
    echo "Or paste your publish output here (press Ctrl+D when done):"
    OUTPUT_FILE="/dev/stdin"
fi

echo ""
echo "Extracting information..."
echo ""

# Extract Package ID (multiple patterns)
PACKAGE_ID=$(grep -iE "packageid|package id|PackageID" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# Extract Transaction Digest
TX_DIGEST=$(grep -iE "digest|Digest" "$OUTPUT_FILE" 2>/dev/null | grep -oE "[A-Za-z0-9]{64}" | head -1)

# Extract Version
VERSION=$(grep -iE "version|Version" "$OUTPUT_FILE" 2>/dev/null | grep -oE "[0-9]+" | head -1)

# Extract Modules
MODULES=$(grep -iE "modules|Modules" "$OUTPUT_FILE" 2>/dev/null | sed 's/.*[Mm]odules: *//' | head -1 | tr -d ',' | xargs)

# Extract all created object IDs
CREATED_OBJECTS=$(grep -iE "object id|id:" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | sort -u)

# Get active address
ACTIVE_ADDRESS=$(sui client active-address 2>/dev/null || echo "0x6df2465c7b9a88e9769a625b3af0afbf41ab61d86183d85eb5fa5b7bd0549c71")

# Create updated info file
cat > CONTRACT_INFO.txt << EOF
========================================
ODX Smart Contract - Deployment Information
========================================
Generated: $(date)
Network: Sui Testnet

PACKAGE INFORMATION
-------------------
Package ID: ${PACKAGE_ID:-[NOT_FOUND - Please check deployment output]}
Version: ${VERSION:-[NOT_FOUND]}
Transaction Digest: ${TX_DIGEST:-[NOT_FOUND]}
Modules: ${MODULES:-datatypes, marketplace, odx, oracle, rewards, token}

DEPLOYER INFORMATION
--------------------
Active Address: ${ACTIVE_ADDRESS}
Network: testnet

MODULES DEPLOYED
----------------
1. datatypes - Shared data structures (IPToken, EngagementData, etc.)
2. token - IP token creation and management (AdminCap, TokenRegistry)
3. marketplace - Trading functionality (buy/sell orders)
4. rewards - Contributor tracking and reward distribution
5. oracle - Price calculation based on engagement metrics
6. odx - Main library module

OBJECT IDs (To be filled after initialization)
----------
AdminCap: [Run token::init() to get this]
TokenRegistry: [Run token::init() to get this]
Marketplace: [Run marketplace::init() to get this]
RewardsRegistry: [Run rewards::init() to get this]
RewardConfig: [Run rewards::init() to get this]
PriceOracle: [Run oracle::init() to get this]
OracleAdminCap: [Run oracle::init() to get this]

INITIALIZATION COMMANDS
-----------------------
Replace <PACKAGE_ID> with: ${PACKAGE_ID:-<PACKAGE_ID>}

1. Initialize Token Module (creates AdminCap and TokenRegistry):
   sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module token --function init --gas-budget 10000000

2. Initialize Marketplace (creates Marketplace object):
   sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module marketplace --function init --gas-budget 10000000

3. Initialize Rewards Module (creates RewardsRegistry and RewardConfig):
   sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module rewards --function init --gas-budget 10000000

4. Initialize Oracle (creates PriceOracle and OracleAdminCap):
   sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module oracle --function init --gas-budget 10000000

INTERACTION EXAMPLES
--------------------
Once initialized, you can interact with the contract:

Create IP Token:
  sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module token --function create_ip_token \\
    --args "<AdminCap_ID>" "<name>" "<symbol>" "<description>" "<category>" "<reserve_pool>" \\
    --gas-budget 10000000

Create Buy Order:
  sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module marketplace --function create_buy_order \\
    --args "<Marketplace_ID>" "<token_id>" "<price>" "<quantity>" "<payment>" \\
    --gas-budget 10000000

Register Engagement:
  sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module rewards --function register_engagement \\
    --args "<RewardsRegistry_ID>" "<token_id>" "<rating>" "<prediction>" \\
    --gas-budget 10000000

FULL DEPLOYMENT OUTPUT
----------------------
Source file: $OUTPUT_FILE
Transaction: ${TX_DIGEST:-N/A}
View on Sui Explorer: https://suiexplorer.com/transaction/${TX_DIGEST:-<TX_DIGEST>}?network=testnet

========================================
EOF

echo "✅ Information extracted and saved to: CONTRACT_INFO.txt"
echo ""
echo "========================================="
echo "Extracted Information:"
echo "========================================="
echo "Package ID: ${PACKAGE_ID:-NOT FOUND}"
echo "Transaction Digest: ${TX_DIGEST:-NOT FOUND}"
echo "Version: ${VERSION:-NOT FOUND}"
echo "Modules: ${MODULES:-NOT FOUND}"
echo ""
if [ -n "$CREATED_OBJECTS" ]; then
    echo "Created Objects:"
    echo "$CREATED_OBJECTS" | while read obj; do
        echo "  - $obj"
    done
fi
echo ""
echo "Full details saved to: CONTRACT_INFO.txt"
echo ""

