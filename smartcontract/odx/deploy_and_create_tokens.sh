#!/bin/bash
# Deploy contracts and create all 10 anime tokens

set -e

cd "$(dirname "$0")"

echo "========================================="
echo "ODX Smart Contract Deployment & Token Creation"
echo "========================================="
echo ""

# Step 1: Build
echo "Step 1: Building contracts..."
sui move build --skip-fetch-latest-git-deps 2>&1 | grep -v "^\[note\]" || true
echo "✓ Build complete"
echo ""

# Step 2: Deploy
echo "Step 2: Deploying contracts..."
echo "Please sign the transaction when prompted..."
echo ""

OUTPUT_FILE="deployment_$(date +%Y%m%d_%H%M%S).txt"
sui client publish --skip-fetch-latest-git-deps > "$OUTPUT_FILE" 2>&1

# Extract Package ID
PACKAGE_ID=$(grep -i "packageid\|package id" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo "❌ Error: Could not extract Package ID from deployment output"
    echo "Please check: $OUTPUT_FILE"
    exit 1
fi

echo "✓ Deployment complete"
echo "Package ID: $PACKAGE_ID"
echo ""

# Extract object IDs
echo "Step 3: Extracting object IDs..."
ADMIN_CAP_ID=$(grep -i "AdminCap\|admin.*cap" "$OUTPUT_FILE" -A 5 | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
TOKEN_REGISTRY_ID=$(grep -i "TokenRegistry\|token.*registry" "$OUTPUT_FILE" -A 5 | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# Alternative method: get all created objects
ALL_OBJECTS=$(grep -i "object id\|id:" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | sort -u)

if [ -z "$ADMIN_CAP_ID" ] || [ -z "$TOKEN_REGISTRY_ID" ]; then
    echo "⚠️  Warning: Could not automatically extract AdminCap or TokenRegistry ID"
    echo "Available object IDs:"
    echo "$ALL_OBJECTS" | head -10
    echo ""
    echo "Please manually extract the IDs from: $OUTPUT_FILE"
    echo "Then run the token creation script manually."
    exit 1
fi

echo "✓ Object IDs extracted"
echo "AdminCap ID: $ADMIN_CAP_ID"
echo "TokenRegistry ID: $TOKEN_REGISTRY_ID"
echo ""

# Save deployment info
cat > "DEPLOYMENT_INFO_$(date +%Y%m%d_%H%M%S).txt" << EOF
========================================
ODX Deployment Information
========================================
Deployed: $(date)
Package ID: $PACKAGE_ID
AdminCap ID: $ADMIN_CAP_ID
TokenRegistry ID: $TOKEN_REGISTRY_ID

All Object IDs:
$ALL_OBJECTS
EOF

echo "Step 4: Creating tokens..."
echo ""

# Check if Node.js script exists
if [ -f "create_tokens.js" ]; then
    echo "Using Node.js script to create tokens..."
    echo ""
    
    # Check if SUI_PRIVATE_KEY is set
    if [ -z "$SUI_PRIVATE_KEY" ] && [ -z "$ADMIN_PRIVATE_KEY" ]; then
        echo "⚠️  Warning: SUI_PRIVATE_KEY or ADMIN_PRIVATE_KEY not set"
        echo "Please set it with: export SUI_PRIVATE_KEY=\"your_base64_private_key\""
        echo ""
        echo "To get your private key:"
        echo "  sui keytool export --key-identity <your-key-identity>"
        echo ""
        read -p "Do you want to continue with token creation? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Skipping token creation. You can run it later with:"
            echo "  node create_tokens.js $PACKAGE_ID $ADMIN_CAP_ID $TOKEN_REGISTRY_ID"
            exit 0
        fi
    fi
    
    # Run Node.js script
    node create_tokens.js "$PACKAGE_ID" "$ADMIN_CAP_ID" "$TOKEN_REGISTRY_ID"
else
    echo "⚠️  Node.js script not found. Skipping token creation."
    echo "You can create tokens manually or install the script."
fi

echo "========================================="
echo "✅ Deployment and Token Creation Complete!"
echo "========================================="
echo ""
echo "Package ID: $PACKAGE_ID"
echo "AdminCap ID: $ADMIN_CAP_ID"
echo "TokenRegistry ID: $TOKEN_REGISTRY_ID"
echo "Tokens Created: $TOKEN_COUNT/10"
echo ""
echo "Deployment output saved to: $OUTPUT_FILE"
echo "Deployment info saved to: DEPLOYMENT_INFO_*.txt"
echo ""

