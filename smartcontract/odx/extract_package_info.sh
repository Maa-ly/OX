#!/bin/bash
# Script to extract package information from Sui publish output

echo "========================================="
echo "ODX Package Information Extractor"
echo "========================================="
echo ""

# Check if user provided output file
if [ -n "$1" ]; then
    OUTPUT_FILE="$1"
else
    echo "Usage: $0 <publish_output_file>"
    echo ""
    echo "Or paste your publish output here and press Ctrl+D:"
    OUTPUT_FILE="/dev/stdin"
fi

echo "Extracting package information..."
echo ""

# Extract Package ID
PACKAGE_ID=$(grep -i "packageid\|package id" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# Extract Transaction Digest
TX_DIGEST=$(grep -i "digest\|transaction" "$OUTPUT_FILE" 2>/dev/null | grep -oE "[A-Za-z0-9]{64}" | head -1)

# Extract Version
VERSION=$(grep -i "version" "$OUTPUT_FILE" 2>/dev/null | grep -oE "[0-9]+" | head -1)

# Extract Modules
MODULES=$(grep -i "modules" "$OUTPUT_FILE" 2>/dev/null | sed 's/.*Modules: *//' | head -1)

# Extract Created Objects
CREATED_OBJECTS=$(grep -i "created objects\|object id" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | tr '\n' ' ')

echo "========================================="
echo "Extracted Information:"
echo "========================================="
echo ""

if [ -n "$PACKAGE_ID" ]; then
    echo "✅ Package ID: $PACKAGE_ID"
else
    echo "❌ Package ID: Not found"
fi

if [ -n "$TX_DIGEST" ]; then
    echo "✅ Transaction Digest: $TX_DIGEST"
else
    echo "❌ Transaction Digest: Not found"
fi

if [ -n "$VERSION" ]; then
    echo "✅ Version: $VERSION"
else
    echo "❌ Version: Not found"
fi

if [ -n "$MODULES" ]; then
    echo "✅ Modules: $MODULES"
else
    echo "❌ Modules: Not found"
fi

if [ -n "$CREATED_OBJECTS" ]; then
    echo "✅ Created Objects: $CREATED_OBJECTS"
else
    echo "❌ Created Objects: Not found"
fi

echo ""
echo "========================================="

# Create deployment info file if package ID found
if [ -n "$PACKAGE_ID" ]; then
    cat > DEPLOYMENT_INFO.txt << EOF
ODX Smart Contract Deployment Information
========================================
Extracted: $(date)
Network: Sui Testnet

Package ID: $PACKAGE_ID
Transaction Digest: $TX_DIGEST
Version: $VERSION
Modules: $MODULES

Created Objects:
$CREATED_OBJECTS

Next Steps:
1. Initialize modules by calling their init() functions
2. Use Package ID for all contract interactions:
   sui client call --package $PACKAGE_ID --module <MODULE> --function <FUNCTION>
EOF
    
    echo "✅ Deployment information saved to: DEPLOYMENT_INFO.txt"
    echo ""
    cat DEPLOYMENT_INFO.txt
fi

