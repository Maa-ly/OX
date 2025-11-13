#!/bin/bash

# Example API calls to test the backend contract service
# Make sure the backend server is running first!

BASE_URL="http://localhost:3000/api/contract"

echo "🧪 Testing Backend Contract API"
echo "================================"
echo ""

# Test 1: Get all tokens
echo "1️⃣  Getting all tokens..."
curl -X GET "$BASE_URL/tokens" \
  -H "Content-Type: application/json" | jq .
echo ""
echo ""

# Test 2: Get price (replace with actual IP token ID)
echo "2️⃣  Getting price for IP token..."
IP_TOKEN_ID="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
curl -X GET "$BASE_URL/oracle/price/$IP_TOKEN_ID" \
  -H "Content-Type: application/json" | jq .
echo ""
echo ""

# Test 3: Get engagement metrics
echo "3️⃣  Getting engagement metrics..."
curl -X GET "$BASE_URL/oracle/metrics/$IP_TOKEN_ID" \
  -H "Content-Type: application/json" | jq .
echo ""
echo ""

# Test 4: Get contributor count
echo "4️⃣  Getting contributor count..."
curl -X GET "$BASE_URL/rewards/contributors/$IP_TOKEN_ID" \
  -H "Content-Type: application/json" | jq .
echo ""
echo ""

# Test 5: Get object details (using a deployed object ID)
echo "5️⃣  Getting object details..."
OBJECT_ID="0x4565bda97f21e43a7fa4f3a9e07ac400ab448fc1f5044a5422fd698b8ceb6936"
curl -X GET "$BASE_URL/objects/$OBJECT_ID" \
  -H "Content-Type: application/json" | jq .
echo ""
echo ""

# Test 6: Update engagement metrics (requires admin keypair)
echo "6️⃣  Updating engagement metrics (requires admin keypair)..."
curl -X POST "$BASE_URL/oracle/update-metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "ipTokenId": "'$IP_TOKEN_ID'",
    "averageRating": 850,
    "totalContributors": 150,
    "totalEngagements": 500,
    "predictionAccuracy": 7500,
    "growthRate": 2500
  }' | jq .
echo ""
echo ""

echo "✅ Tests complete!"
echo ""
echo "Note: Some tests may fail if:"
echo "  - Backend server is not running"
echo "  - Object IDs don't exist"
echo "  - Admin keypair is not configured"
echo "  - Insufficient gas balance"

