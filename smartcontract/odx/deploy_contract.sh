#!/bin/bash
# ODX Smart Contract Deployment Script
# This script builds and deploys the ODX smart contract to Sui testnet

set -e  # Exit on error

cd "$(dirname "$0")"

echo "========================================="
echo "ODX Smart Contract Deployment"
echo "========================================="
echo ""

# Step 1: Build the package
echo "Step 1: Building ODX package..."
sui move build --skip-fetch-latest-git-deps || sui move build
echo "✓ Build completed"
echo ""

# Step 2: Check configuration
echo "Step 2: Checking Sui client configuration..."
echo "Active Environment:"
sui client active-env
echo ""
echo "Active Address:"
ACTIVE_ADDRESS=$(sui client active-address)
echo "$ACTIVE_ADDRESS"
echo ""
echo "Balance:"
sui client balance
echo ""

# Step 3: Publish the package
echo "Step 3: Publishing package to Sui testnet..."
echo "This may take a few minutes..."
echo ""

OUTPUT_FILE="deployment_output_$(date +%Y%m%d_%H%M%S).txt"

if sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps > "$OUTPUT_FILE" 2>&1; then
    echo "✓ Deployment completed successfully!"
    echo ""
    echo "Deployment output saved to: $OUTPUT_FILE"
    echo ""
    echo "========================================="
    echo "Extracting Package Information..."
    echo "========================================="
    
    # Extract Package ID from output
    PACKAGE_ID=$(grep -i "packageid" "$OUTPUT_FILE" | grep -oE "0x[a-fA-F0-9]+" | head -1)
    if [ -n "$PACKAGE_ID" ]; then
        echo "Package ID: $PACKAGE_ID"
    fi
    
    # Extract transaction digest
    TX_DIGEST=$(grep -i "digest" "$OUTPUT_FILE" | grep -oE "[A-Za-z0-9]{64}" | head -1)
    if [ -n "$TX_DIGEST" ]; then
        echo "Transaction Digest: $TX_DIGEST"
    fi
    
    echo ""
    echo "Full deployment output:"
    cat "$OUTPUT_FILE"
    
    # Create deployment info file
    cat > DEPLOYMENT_INFO.txt << EOF
ODX Smart Contract Deployment Information
========================================
Deployment Date: $(date)
Network: Sui Testnet
Active Address: $ACTIVE_ADDRESS

Package ID: $PACKAGE_ID
Transaction Digest: $TX_DIGEST

Modules Deployed:
- datatypes
- token
- marketplace
- rewards
- oracle
- odx

Next Steps:
1. Save the Package ID above for all future interactions
2. Initialize modules by calling their init() functions
3. Use the Package ID to interact with the contract:
   sui client call --package $PACKAGE_ID --module <MODULE_NAME> --function <FUNCTION_NAME>

Full deployment log: $OUTPUT_FILE
EOF
    
    echo ""
    echo "Deployment information saved to: DEPLOYMENT_INFO.txt"
    
else
    echo "✗ Deployment failed!"
    echo ""
    echo "Error output:"
    cat "$OUTPUT_FILE"
    exit 1
fi


