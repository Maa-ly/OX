#!/bin/bash
# Create tokens using IDs from deployment output or manual input

set -e

cd "$(dirname "$0")"

echo "========================================="
echo "Create Anime Tokens"
echo "========================================="
echo ""

# Check if deployment output file provided
if [ -n "$1" ]; then
    OUTPUT_FILE="$1"
    echo "Extracting IDs from: $OUTPUT_FILE"
    echo ""
    
    # Extract Package ID
    PACKAGE_ID=$(grep -iE "packageid|package id" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
    
    # Extract all object IDs
    ALL_IDS=($(grep -oE "0x[a-fA-F0-9]{64}" "$OUTPUT_FILE" | sort -u))
    
    # Try to identify AdminCap and TokenRegistry
    ADMIN_CAP_ID=$(grep -iE "AdminCap|admin.*cap" "$OUTPUT_FILE" -A 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
    TOKEN_REGISTRY_ID=$(grep -iE "TokenRegistry|token.*registry" "$OUTPUT_FILE" -A 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
    
    # If not found, use first two object IDs (usually AdminCap and TokenRegistry)
    if [ -z "$ADMIN_CAP_ID" ] && [ ${#ALL_IDS[@]} -ge 1 ]; then
        ADMIN_CAP_ID=${ALL_IDS[0]}
    fi
    if [ -z "$TOKEN_REGISTRY_ID" ] && [ ${#ALL_IDS[@]} -ge 2 ]; then
        TOKEN_REGISTRY_ID=${ALL_IDS[1]}
    fi
else
    # Manual input
    echo "Please provide the deployment IDs:"
    echo ""
    read -p "Package ID: " PACKAGE_ID
    read -p "AdminCap ID: " ADMIN_CAP_ID
    read -p "TokenRegistry ID: " TOKEN_REGISTRY_ID
fi

if [ -z "$PACKAGE_ID" ] || [ -z "$ADMIN_CAP_ID" ] || [ -z "$TOKEN_REGISTRY_ID" ]; then
    echo ""
    echo "Error: Missing required IDs"
    echo ""
    echo "Usage: $0 [deployment_output_file]"
    echo ""
    echo "Or provide IDs manually when prompted"
    exit 1
fi

echo ""
echo "Using IDs:"
echo "Package ID: $PACKAGE_ID"
echo "AdminCap ID: $ADMIN_CAP_ID"
echo "TokenRegistry ID: $TOKEN_REGISTRY_ID"
echo ""

# Check for private key
if [ -z "$SUI_PRIVATE_KEY" ] && [ -z "$ADMIN_PRIVATE_KEY" ]; then
    echo "Error: SUI_PRIVATE_KEY or ADMIN_PRIVATE_KEY not set"
    echo ""
    echo "Set it with:"
    echo "  export SUI_PRIVATE_KEY=\"your_base64_private_key\""
    echo ""
    echo "Or run manually:"
    echo "  node create_tokens.js $PACKAGE_ID $ADMIN_CAP_ID $TOKEN_REGISTRY_ID"
    exit 1
fi

# Create tokens
echo "Creating all 10 anime tokens..."
echo ""

if command -v node &> /dev/null; then
    node create_tokens.js "$PACKAGE_ID" "$ADMIN_CAP_ID" "$TOKEN_REGISTRY_ID"
else
    echo "Error: Node.js not found"
    exit 1
fi


