#!/bin/bash
# Extract deployment IDs and create all tokens

set -e

cd "$(dirname "$0")"

echo "========================================="
echo "Extract IDs and Create Tokens"
echo "========================================="
echo ""

# Method 1: Try to get from most recent transaction
echo "Attempting to extract IDs from recent deployment..."
echo ""

# Get active address
ACTIVE_ADDRESS=$(sui client active-address 2>/dev/null)
if [ -z "$ACTIVE_ADDRESS" ]; then
    echo "Error: Could not get active address"
    exit 1
fi

echo "Active address: $ACTIVE_ADDRESS"
echo ""

# Get all objects and filter for our package
echo "Querying objects..."
ALL_OBJECTS=$(sui client objects "$ACTIVE_ADDRESS" 2>&1 | grep -oE "0x[a-fA-F0-9]{64}" | sort -u)

# Try to find Package ID (it will be in the object type)
PACKAGE_OBJECTS=$(sui client objects "$ACTIVE_ADDRESS" 2>&1 | grep -i "package" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# Get AdminCap and TokenRegistry
ADMIN_CAP=$(sui client objects "$ACTIVE_ADDRESS" 2>&1 | grep -i "AdminCap" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
TOKEN_REGISTRY=$(sui client objects "$ACTIVE_ADDRESS" 2>&1 | grep -i "TokenRegistry" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# Alternative: Get all object IDs and let user select
if [ -z "$PACKAGE_OBJECTS" ] || [ -z "$ADMIN_CAP" ] || [ -z "$TOKEN_REGISTRY" ]; then
    echo "Could not automatically extract all IDs."
    echo ""
    echo "Please provide the IDs manually:"
    echo ""
    echo "From your deployment output, find:"
    echo "1. Package ID (in 'Published Objects' section)"
    echo "2. AdminCap ID (in 'Created Objects' section)"
    echo "3. TokenRegistry ID (in 'Created Objects' section)"
    echo ""
    read -p "Package ID: " PACKAGE_ID
    read -p "AdminCap ID: " ADMIN_CAP_ID
    read -p "TokenRegistry ID: " TOKEN_REGISTRY_ID
else
    PACKAGE_ID="$PACKAGE_OBJECTS"
    ADMIN_CAP_ID="$ADMIN_CAP"
    TOKEN_REGISTRY_ID="$TOKEN_REGISTRY"
fi

if [ -z "$PACKAGE_ID" ] || [ -z "$ADMIN_CAP_ID" ] || [ -z "$TOKEN_REGISTRY_ID" ]; then
    echo "Error: Missing required IDs"
    exit 1
fi

echo ""
echo "Extracted IDs:"
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
    echo "Or run the token creation manually:"
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

echo ""
echo "========================================="
echo "✅ Token Creation Complete!"
echo "========================================="


