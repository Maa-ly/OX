#!/bin/bash
# Complete deployment script that captures all output and saves package information

set -e

cd "$(dirname "$0")"

OUTPUT_FILE="deployment_complete_$(date +%Y%m%d_%H%M%S).txt"
INFO_FILE="CONTRACT_INFO.txt"

echo "========================================="
echo "ODX Smart Contract Deployment"
echo "========================================="
echo ""
echo "This will publish the contract and save all information."
echo "You will be prompted to sign the transaction."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

echo "Building package..."
sui move build --skip-fetch-latest-git-deps 2>&1 | grep -v "^\[note\]" || true
echo "✓ Build complete"
echo ""

echo "Publishing to Sui testnet..."
echo "Please sign the transaction when prompted..."
echo ""

# Run publish and capture all output
sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps > "$OUTPUT_FILE" 2>&1

echo ""
echo "========================================="
echo "Extracting Package Information..."
echo "========================================="
echo ""

# Extract Package ID
PACKAGE_ID=$(grep -i "packageid\|package id" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# Extract Transaction Digest
TX_DIGEST=$(grep -i "digest" "$OUTPUT_FILE" 2>/dev/null | grep -oE "[A-Za-z0-9]{64}" | head -1)

# Extract Version
VERSION=$(grep -i "version" "$OUTPUT_FILE" 2>/dev/null | grep -oE "[0-9]+" | head -1)

# Extract Modules
MODULES=$(grep -i "modules" "$OUTPUT_FILE" 2>/dev/null | sed 's/.*[Mm]odules: *//' | head -1 | tr -d ',')

# Extract all object IDs
OBJECT_IDS=$(grep -i "object id\|id:" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | sort -u | tr '\n' ' ')

# Get active address
ACTIVE_ADDRESS=$(sui client active-address 2>/dev/null || echo "unknown")

# Create comprehensive info file
cat > "$INFO_FILE" << EOF
========================================
ODX Smart Contract - Deployment Information
========================================
Generated: $(date)
Network: Sui Testnet

PACKAGE INFORMATION
-------------------
Package ID: ${PACKAGE_ID:-NOT_FOUND}
Version: ${VERSION:-NOT_FOUND}
Transaction Digest: ${TX_DIGEST:-NOT_FOUND}
Modules: ${MODULES:-NOT_FOUND}

DEPLOYER INFORMATION
--------------------
Active Address: ${ACTIVE_ADDRESS}
Network: testnet

MODULES DEPLOYED
----------------
1. datatypes - Shared data structures
2. token - IP token creation and management
3. marketplace - Trading functionality
4. rewards - Contributor tracking and rewards
5. oracle - Price calculation
6. odx - Main library module

OBJECT IDs
----------
${OBJECT_IDS:-No objects found}

NEXT STEPS
----------
1. Initialize Token Module:
   sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module token --function init --gas-budget 10000000

2. Initialize Marketplace:
   sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module marketplace --function init --gas-budget 10000000

3. Initialize Rewards Module:
   sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module rewards --function init --gas-budget 10000000

4. Initialize Oracle:
   sui client call --package ${PACKAGE_ID:-<PACKAGE_ID>} --module oracle --function init --gas-budget 10000000

FULL DEPLOYMENT OUTPUT
----------------------
See: $OUTPUT_FILE

========================================
EOF

echo "✅ Deployment information saved to: $INFO_FILE"
echo ""
cat "$INFO_FILE"
echo ""
echo "Full deployment output saved to: $OUTPUT_FILE"

