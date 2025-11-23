#!/bin/bash
# Complete deployment and token creation script
# This script will deploy contracts and create all 10 tokens

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

# Step 2: Deploy (will prompt for signature)
echo "Step 2: Deploying contracts..."
echo "⚠️  You will be prompted to sign the transaction."
echo "⚠️  Make sure you have enough SUI for gas fees."
echo ""
read -p "Press Enter to continue with deployment..."
echo ""

OUTPUT_FILE="deployment_$(date +%Y%m%d_%H%M%S).txt"
sui client publish --skip-fetch-latest-git-deps 2>&1 | tee "$OUTPUT_FILE"

# Extract Package ID
PACKAGE_ID=$(grep -i "packageid\|package id" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo ""
    echo "❌ Error: Could not extract Package ID from deployment output"
    echo "Please check: $OUTPUT_FILE"
    echo ""
    echo "You can manually extract the IDs and run:"
    echo "  node create_tokens.js <PACKAGE_ID> <ADMIN_CAP_ID> <TOKEN_REGISTRY_ID>"
    exit 1
fi

echo ""
echo "✓ Deployment complete"
echo "Package ID: $PACKAGE_ID"
echo ""

# Extract object IDs - try multiple methods
echo "Step 3: Extracting object IDs..."
ADMIN_CAP_ID=$(grep -i "AdminCap" "$OUTPUT_FILE" -A 10 | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
TOKEN_REGISTRY_ID=$(grep -i "TokenRegistry" "$OUTPUT_FILE" -A 10 | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# Alternative: get all object IDs and try to identify
if [ -z "$ADMIN_CAP_ID" ] || [ -z "$TOKEN_REGISTRY_ID" ]; then
    echo "Trying alternative extraction method..."
    ALL_OBJECTS=($(grep -i "object id\|id:" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | sort -u))
    
    if [ ${#ALL_OBJECTS[@]} -ge 2 ]; then
        ADMIN_CAP_ID=${ALL_OBJECTS[0]}
        TOKEN_REGISTRY_ID=${ALL_OBJECTS[1]}
    fi
fi

if [ -z "$ADMIN_CAP_ID" ] || [ -z "$TOKEN_REGISTRY_ID" ]; then
    echo ""
    echo "⚠️  Warning: Could not automatically extract AdminCap or TokenRegistry ID"
    echo "Available object IDs from deployment:"
    grep -i "object id\|id:" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | sort -u | head -10
    echo ""
    echo "Please manually extract the IDs from: $OUTPUT_FILE"
    echo "Then run: node create_tokens.js <PACKAGE_ID> <ADMIN_CAP_ID> <TOKEN_REGISTRY_ID>"
    exit 1
fi

echo "✓ Object IDs extracted"
echo "AdminCap ID: $ADMIN_CAP_ID"
echo "TokenRegistry ID: $TOKEN_REGISTRY_ID"
echo ""

# Save deployment info
INFO_FILE="DEPLOYMENT_INFO_$(date +%Y%m%d_%H%M%S).txt"
cat > "$INFO_FILE" << EOF
========================================
ODX Deployment Information
========================================
Deployed: $(date)
Package ID: $PACKAGE_ID
AdminCap ID: $ADMIN_CAP_ID
TokenRegistry ID: $TOKEN_REGISTRY_ID

All Object IDs:
$(grep -i "object id\|id:" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | sort -u)
EOF

echo "Deployment info saved to: $INFO_FILE"
echo ""

# Step 4: Create tokens
echo "Step 4: Creating tokens..."
echo ""

# Check for private key
if [ -z "$SUI_PRIVATE_KEY" ] && [ -z "$ADMIN_PRIVATE_KEY" ]; then
    echo "⚠️  SUI_PRIVATE_KEY or ADMIN_PRIVATE_KEY not set"
    echo ""
    echo "To create tokens, you need to set your private key:"
    echo "  export SUI_PRIVATE_KEY=\"your_base64_private_key\""
    echo ""
    echo "Or you can create tokens manually later with:"
    echo "  node create_tokens.js $PACKAGE_ID $ADMIN_CAP_ID $TOKEN_REGISTRY_ID"
    echo ""
    exit 0
fi

# Run Node.js script to create tokens
if command -v node &> /dev/null; then
    echo "Creating all 10 anime tokens..."
    node create_tokens.js "$PACKAGE_ID" "$ADMIN_CAP_ID" "$TOKEN_REGISTRY_ID"
else
    echo "⚠️  Node.js not found. Please install Node.js to create tokens automatically."
    echo ""
    echo "Or create tokens manually using the Sui CLI or frontend."
fi

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Package ID: $PACKAGE_ID"
echo "AdminCap ID: $ADMIN_CAP_ID"
echo "TokenRegistry ID: $TOKEN_REGISTRY_ID"
echo ""
echo "Next steps:"
echo "1. Update your .env file with these IDs"
echo "2. If tokens weren't created, run: node create_tokens.js $PACKAGE_ID $ADMIN_CAP_ID $TOKEN_REGISTRY_ID"
echo ""


