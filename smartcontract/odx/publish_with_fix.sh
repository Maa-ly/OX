#!/bin/bash
# Publish script with gas fix

cd "$(dirname "$0")"

echo "========================================="
echo "ODX Contract Publishing with Gas Fix"
echo "========================================="
echo ""

# Check balance
echo "Checking balance..."
sui client balance
echo ""

# Check gas objects
echo "Checking gas objects..."
sui client gas
echo ""

# Try publishing with higher gas budget
echo "Attempting to publish with 0.5 SUI gas budget..."
echo ""

OUTPUT_FILE="publish_output_$(date +%Y%m%d_%H%M%S).txt"

if sui client publish --gas-budget 500000000 --skip-fetch-latest-git-deps --verify-deps > "$OUTPUT_FILE" 2>&1; then
    echo "✅ Publishing successful!"
    echo ""
    echo "Extracting package information..."
    ./save_deployment_info.sh "$OUTPUT_FILE"
    echo ""
    echo "Check CONTRACT_INFO.txt for all details!"
else
    echo "❌ Publishing failed. Trying without gas budget (auto-calculate)..."
    echo ""
    
    if sui client publish --skip-fetch-latest-git-deps --verify-deps > "$OUTPUT_FILE" 2>&1; then
        echo "✅ Publishing successful with auto gas!"
        echo ""
        ./save_deployment_info.sh "$OUTPUT_FILE"
    else
        echo "❌ Still failed. Check the output:"
        cat "$OUTPUT_FILE"
        echo ""
        echo "Possible issues:"
        echo "1. Not enough SUI tokens"
        echo "2. Network connectivity issues"
        echo "3. Transaction signing failed"
    fi
fi

