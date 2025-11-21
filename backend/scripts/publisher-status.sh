#!/bin/bash

# Quick status check for Walrus Publisher

echo "=== Walrus Publisher Status ==="
echo ""

# Check if publisher is running
if lsof -i :31416 > /dev/null 2>&1; then
    echo "✓ Publisher is running on port 31416"
    lsof -i :31416 | head -2
else
    echo "✗ Publisher is NOT running on port 31416"
fi

echo ""

# Check environment variable
if [ -f .env ]; then
    if grep -q "WALRUS_PUBLISHER_URL" .env; then
        PUBLISHER_URL=$(grep "WALRUS_PUBLISHER_URL" .env | cut -d'=' -f2)
        echo "✓ WALRUS_PUBLISHER_URL configured: $PUBLISHER_URL"
    else
        echo "✗ WALRUS_PUBLISHER_URL not found in .env"
    fi
else
    echo "⚠ .env file not found"
fi

echo ""

# Check wallet balance
echo "Wallet Status:"
sui client gas 2>&1 | grep -A 3 "suiBalance" | head -3 || echo "Could not check wallet balance"

echo ""
echo "To start publisher: ./scripts/start-walrus-publisher.sh"
echo "To stop publisher: pkill -f 'walrus publisher'"

