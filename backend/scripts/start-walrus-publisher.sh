#!/bin/bash

# Start Walrus Publisher Daemon
# This allows your backend to pay for user posts on Walrus
# The publisher uses your wallet (from ADMIN_PRIVATE_KEY) to pay for storage

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Walrus Publisher Daemon...${NC}"

# Check if walrus command exists
if ! command -v walrus &> /dev/null; then
    echo -e "${RED}Error: walrus command not found${NC}"
    echo "Please install walrus CLI first:"
    echo "  - It should be at: ~/.local/bin/walrus"
    echo "  - Or install via suiup"
    exit 1
fi

# Configuration
BIND_ADDRESS="${WALRUS_PUBLISHER_BIND:-127.0.0.1:31416}"
PUBLISHER_WALLETS_DIR="${WALRUS_PUBLISHER_WALLETS_DIR:-$HOME/.config/walrus/publisher-wallets}"
N_CLIENTS="${WALRUS_PUBLISHER_N_CLIENTS:-1}"
CONFIG_PATH="${WALRUS_CONFIG_PATH:-$HOME/.config/walrus/client_config.yaml}"
CONTEXT="${WALRUS_CONTEXT:-testnet}"

# Create publisher wallets directory
mkdir -p "$PUBLISHER_WALLETS_DIR"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Bind Address: $BIND_ADDRESS"
echo "  Wallets Dir: $PUBLISHER_WALLETS_DIR"
echo "  Clients: $N_CLIENTS"
echo "  Config: $CONFIG_PATH"
echo "  Context: $CONTEXT"
echo ""

# Check if wallet has WAL tokens
echo -e "${YELLOW}Checking wallet configuration...${NC}"
if [ -f "$CONFIG_PATH" ]; then
    echo "✓ Walrus config found: $CONFIG_PATH"
else
    echo -e "${RED}✗ Walrus config not found: $CONFIG_PATH${NC}"
    echo "Please ensure your Walrus config is set up"
fi

# Check Sui wallet
SUI_CONFIG="$HOME/.sui/sui_config/client.yaml"
if [ -f "$SUI_CONFIG" ]; then
    ACTIVE_ADDRESS=$(grep "active_address:" "$SUI_CONFIG" | head -1 | sed 's/.*"\(.*\)".*/\1/' || echo "")
    if [ -n "$ACTIVE_ADDRESS" ]; then
        echo "✓ Sui wallet found: $ACTIVE_ADDRESS"
        echo "  Make sure this wallet has WAL tokens (run: walrus get-wal)"
    else
        echo -e "${YELLOW}⚠ Could not determine active Sui address${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Sui config not found: $SUI_CONFIG${NC}"
fi

echo ""
echo -e "${GREEN}Starting publisher daemon...${NC}"
echo "  Publisher will be available at: http://$BIND_ADDRESS"
echo "  Update your backend config to use: WALRUS_PUBLISHER_URL=http://$BIND_ADDRESS"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the publisher${NC}"
echo ""

# Start the publisher
walrus publisher \
  --bind-address "$BIND_ADDRESS" \
  --sub-wallets-dir "$PUBLISHER_WALLETS_DIR" \
  --n-clients "$N_CLIENTS" \
  --config "$CONFIG_PATH" \
  --context "$CONTEXT"

