#!/bin/bash
# Fix DNS without sudo - user-level workaround

echo "Attempting to fix DNS issues (no sudo required)..."
echo ""

# Test current connectivity
echo "Testing current connectivity..."
if timeout 5 curl -s https://fullnode.testnet.sui.io:443 > /dev/null 2>&1; then
    echo "✅ Connection is working! Try: sui client balance"
    exit 0
fi

echo "Connection still failing. This requires sudo access to fix DNS."
echo ""
echo "Please run these commands manually (they require your password):"
echo ""
echo "1. Fix DNS configuration:"
echo "   sudo bash -c 'cat > /etc/wsl.conf' << 'EOF'"
echo "   [network]"
echo "   generateResolvConf = false"
echo "   EOF"
echo ""
echo "2. Set custom DNS:"
echo "   sudo rm /etc/resolv.conf"
echo "   sudo bash -c 'echo \"nameserver 8.8.8.8\" > /etc/resolv.conf'"
echo "   sudo bash -c 'echo \"nameserver 8.8.4.4\" >> /etc/resolv.conf'"
echo ""
echo "3. Restart WSL (in Windows PowerShell as admin):"
echo "   wsl --shutdown"
echo ""
echo "4. Then restart your terminal and try:"
echo "   sui client balance"
echo ""
echo "OR try the simpler solution:"
echo "   Just restart WSL: wsl --shutdown (in PowerShell)"
echo "   Then try again - WSL DNS issues are often temporary"

