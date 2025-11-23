#!/bin/bash
# Complete deployment script: deploy, extract info, update .env, and create tokens
# This script deploys without gas limit, extracts all information, updates .env, and creates tokens

set -e

cd "$(dirname "$0")"

ENV_FILE="../../backend/.env"
OUTPUT_FILE="deployment_full_$(date +%Y%m%d_%H%M%S).txt"

echo "========================================="
echo "ODX Smart Contract Deployment"
echo "========================================="
echo ""
echo "This script will:"
echo "1. Build the contract"
echo "2. Deploy to Sui testnet (without gas limit)"
echo "3. Extract all deployment information"
echo "4. Update .env file with new deployment info"
echo "5. Create all tokens"
echo ""
echo "⚠️  You will be prompted to sign the transaction."
echo "⚠️  Make sure you have enough SUI for gas fees."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Step 1: Build
echo "Step 1: Building contracts..."
sui move build --skip-fetch-latest-git-deps 2>&1 | grep -v "^\[note\]" || true
echo "✓ Build complete"
echo ""

# Step 2: Deploy (without gas limit)
echo "Step 2: Deploying contracts to Sui testnet..."
echo "⚠️  Please sign the transaction when prompted..."
echo ""

# Deploy without gas limit
sui client publish --skip-fetch-latest-git-deps 2>&1 | tee "$OUTPUT_FILE"

# Check if deployment was successful
if ! grep -qi "packageid\|package id\|Published Objects" "$OUTPUT_FILE"; then
    echo ""
    echo "❌ Error: Deployment may have failed. Check the output above."
    echo "Full output saved to: $OUTPUT_FILE"
    exit 1
fi

echo ""
echo "✓ Deployment completed successfully!"
echo ""

# Step 3: Extract all information
echo "========================================="
echo "Step 3: Extracting Deployment Information"
echo "========================================="
echo ""

# Extract Package ID
PACKAGE_ID=$(grep -iE "packageid|package id" "$OUTPUT_FILE" 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# Extract Transaction Digest
TX_DIGEST=$(grep -iE "digest|Digest" "$OUTPUT_FILE" 2>/dev/null | grep -oE "[A-Za-z0-9]{64}" | head -1)

# Extract Version
VERSION=$(grep -iE "version|Version" "$OUTPUT_FILE" 2>/dev/null | grep -oE "[0-9]+" | head -1)

# Extract all object IDs from the output
ALL_OBJECT_IDS=($(grep -oE "0x[a-fA-F0-9]{64}" "$OUTPUT_FILE" | sort -u))

# Try to identify specific objects by looking at context
ADMIN_CAP_ID=$(grep -iE "AdminCap|admin.*cap" "$OUTPUT_FILE" -A 5 -B 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
TOKEN_REGISTRY_ID=$(grep -iE "TokenRegistry|token.*registry" "$OUTPUT_FILE" -A 5 -B 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
ORACLE_OBJECT_ID=$(grep -iE "PriceOracle|oracle" "$OUTPUT_FILE" -A 5 -B 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
ORACLE_ADMIN_CAP_ID=$(grep -iE "OracleAdminCap|oracle.*admin" "$OUTPUT_FILE" -A 5 -B 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
MARKETPLACE_OBJECT_ID=$(grep -iE "Marketplace|marketplace" "$OUTPUT_FILE" -A 5 -B 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
REWARDS_REGISTRY_ID=$(grep -iE "RewardsRegistry|rewards.*registry" "$OUTPUT_FILE" -A 5 -B 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
REWARD_CONFIG_ID=$(grep -iE "RewardConfig|reward.*config" "$OUTPUT_FILE" -A 5 -B 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
BLOB_STORAGE_REGISTRY_ID=$(grep -iE "BlobStorage|blob.*storage" "$OUTPUT_FILE" -A 5 -B 5 2>/dev/null | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

# If we couldn't identify specific objects, use the object IDs in order
# Usually the first few objects are AdminCap, TokenRegistry, etc.
if [ -z "$ADMIN_CAP_ID" ] && [ ${#ALL_OBJECT_IDS[@]} -ge 1 ]; then
    ADMIN_CAP_ID=${ALL_OBJECT_IDS[0]}
fi
if [ -z "$TOKEN_REGISTRY_ID" ] && [ ${#ALL_OBJECT_IDS[@]} -ge 2 ]; then
    TOKEN_REGISTRY_ID=${ALL_OBJECT_IDS[1]}
fi

# Get active address
ACTIVE_ADDRESS=$(sui client active-address 2>/dev/null || echo "")

# Display extracted information
echo "Extracted Information:"
echo "---------------------"
echo "Package ID: ${PACKAGE_ID:-NOT FOUND}"
echo "Transaction Digest: ${TX_DIGEST:-NOT FOUND}"
echo "Version: ${VERSION:-NOT FOUND}"
echo "Active Address: ${ACTIVE_ADDRESS:-NOT FOUND}"
echo ""
echo "Object IDs:"
[ -n "$ADMIN_CAP_ID" ] && echo "  AdminCap: $ADMIN_CAP_ID"
[ -n "$TOKEN_REGISTRY_ID" ] && echo "  TokenRegistry: $TOKEN_REGISTRY_ID"
[ -n "$ORACLE_OBJECT_ID" ] && echo "  Oracle: $ORACLE_OBJECT_ID"
[ -n "$ORACLE_ADMIN_CAP_ID" ] && echo "  OracleAdminCap: $ORACLE_ADMIN_CAP_ID"
[ -n "$MARKETPLACE_OBJECT_ID" ] && echo "  Marketplace: $MARKETPLACE_OBJECT_ID"
[ -n "$REWARDS_REGISTRY_ID" ] && echo "  RewardsRegistry: $REWARDS_REGISTRY_ID"
[ -n "$REWARD_CONFIG_ID" ] && echo "  RewardConfig: $REWARD_CONFIG_ID"
[ -n "$BLOB_STORAGE_REGISTRY_ID" ] && echo "  BlobStorageRegistry: $BLOB_STORAGE_REGISTRY_ID"
echo ""

if [ -z "$PACKAGE_ID" ]; then
    echo "❌ Error: Could not extract Package ID from deployment output"
    echo "Please check: $OUTPUT_FILE"
    exit 1
fi

# Step 4: Update .env file
echo "========================================="
echo "Step 4: Updating .env file"
echo "========================================="
echo ""

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at: $ENV_FILE"
    exit 1
fi

# Backup .env file
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✓ Backed up .env file"

# Read the current private key to preserve it
ADMIN_PRIVATE_KEY=$(grep "^ADMIN_PRIVATE_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")

# Update .env file with new deployment information
# We'll use a temporary file to build the new .env
TEMP_ENV=$(mktemp)

# Copy existing lines, updating only the deployment-related variables
while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines, but preserve them
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo "$line" >> "$TEMP_ENV"
        continue
    fi
    
    # Update deployment-related variables
    if [[ "$line" =~ ^PACKAGE_ID= ]]; then
        echo "PACKAGE_ID=${PACKAGE_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^ADMIN_CAP_ID= ]] && [ -n "$ADMIN_CAP_ID" ]; then
        echo "ADMIN_CAP_ID=${ADMIN_CAP_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^ORACLE_OBJECT_ID= ]] && [ -n "$ORACLE_OBJECT_ID" ]; then
        echo "ORACLE_OBJECT_ID=${ORACLE_OBJECT_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^ORACLE_ADMIN_CAP_ID= ]] && [ -n "$ORACLE_ADMIN_CAP_ID" ]; then
        echo "ORACLE_ADMIN_CAP_ID=${ORACLE_ADMIN_CAP_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^MARKETPLACE_OBJECT_ID= ]] && [ -n "$MARKETPLACE_OBJECT_ID" ]; then
        echo "MARKETPLACE_OBJECT_ID=${MARKETPLACE_OBJECT_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^TOKEN_REGISTRY_ID= ]] && [ -n "$TOKEN_REGISTRY_ID" ]; then
        echo "TOKEN_REGISTRY_ID=${TOKEN_REGISTRY_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^REWARDS_REGISTRY_ID= ]] && [ -n "$REWARDS_REGISTRY_ID" ]; then
        echo "REWARDS_REGISTRY_ID=${REWARDS_REGISTRY_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^REWARD_CONFIG_ID= ]] && [ -n "$REWARD_CONFIG_ID" ]; then
        echo "REWARD_CONFIG_ID=${REWARD_CONFIG_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^PRICE_ORACLE_ID= ]] && [ -n "$ORACLE_OBJECT_ID" ]; then
        echo "PRICE_ORACLE_ID=${ORACLE_OBJECT_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^BLOB_STORAGE_REGISTRY_ID= ]] && [ -n "$BLOB_STORAGE_REGISTRY_ID" ]; then
        echo "BLOB_STORAGE_REGISTRY_ID=${BLOB_STORAGE_REGISTRY_ID}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^ADMIN_ADDRESS= ]] && [ -n "$ACTIVE_ADDRESS" ]; then
        echo "ADMIN_ADDRESS=${ACTIVE_ADDRESS}" >> "$TEMP_ENV"
    elif [[ "$line" =~ ^ADMIN_PRIVATE_KEY= ]]; then
        # Preserve the private key
        if [ -n "$ADMIN_PRIVATE_KEY" ]; then
            echo "ADMIN_PRIVATE_KEY=${ADMIN_PRIVATE_KEY}" >> "$TEMP_ENV"
        else
            echo "$line" >> "$TEMP_ENV"
        fi
    else
        # Keep all other lines as-is
        echo "$line" >> "$TEMP_ENV"
    fi
done < "$ENV_FILE"

# Replace .env with updated version
mv "$TEMP_ENV" "$ENV_FILE"
echo "✓ Updated .env file with new deployment information"
echo ""

# Step 5: Create tokens
echo "========================================="
echo "Step 5: Creating Tokens"
echo "========================================="
echo ""

if [ -z "$ADMIN_CAP_ID" ] || [ -z "$TOKEN_REGISTRY_ID" ]; then
    echo "⚠️  Warning: Could not extract AdminCap or TokenRegistry ID"
    echo "You may need to create tokens manually using:"
    echo "  ./create_tokens_from_output.sh $OUTPUT_FILE"
    echo ""
else
    echo "Creating tokens using:"
    echo "  Package ID: $PACKAGE_ID"
    echo "  AdminCap ID: $ADMIN_CAP_ID"
    echo "  TokenRegistry ID: $TOKEN_REGISTRY_ID"
    echo ""
    
    # Export private key for token creation script
    # The create_tokens.js script now handles both hex and base64 formats
    if [ -n "$ADMIN_PRIVATE_KEY" ]; then
        export SUI_PRIVATE_KEY="$ADMIN_PRIVATE_KEY"
        export ADMIN_PRIVATE_KEY="$ADMIN_PRIVATE_KEY"
    fi
    
    # Run token creation script with correct IDs
    if [ -f "create_tokens_from_output.sh" ]; then
        chmod +x create_tokens_from_output.sh
        # Pass the IDs directly instead of relying on extraction from file
        export PACKAGE_ID_FOR_TOKENS="$PACKAGE_ID"
        export ADMIN_CAP_ID_FOR_TOKENS="$ADMIN_CAP_ID"
        export TOKEN_REGISTRY_ID_FOR_TOKENS="$TOKEN_REGISTRY_ID"
        # Create tokens directly with node using the correct IDs
        if command -v node &> /dev/null; then
            echo "Creating tokens with correct IDs..."
            node create_tokens.js "$PACKAGE_ID" "$ADMIN_CAP_ID" "$TOKEN_REGISTRY_ID"
        else
            echo "⚠️  Warning: Node.js not found, cannot create tokens"
            echo "You can create tokens manually with:"
            echo "  node create_tokens.js $PACKAGE_ID $ADMIN_CAP_ID $TOKEN_REGISTRY_ID"
        fi
    else
        echo "⚠️  Warning: create_tokens_from_output.sh not found"
        echo "You can create tokens manually with:"
        echo "  node create_tokens.js $PACKAGE_ID $ADMIN_CAP_ID $TOKEN_REGISTRY_ID"
    fi
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "  Package ID: $PACKAGE_ID"
echo "  Transaction: $TX_DIGEST"
echo "  Output file: $OUTPUT_FILE"
echo "  .env updated: $ENV_FILE"
echo ""
echo "View transaction on Sui Explorer:"
echo "  https://suiexplorer.com/transaction/${TX_DIGEST}?network=testnet"
echo ""

