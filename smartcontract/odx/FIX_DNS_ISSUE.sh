#!/bin/bash
# Quick fix script for DNS/network issues with Sui client

echo "Fixing DNS/Network Issues for Sui Client"
echo "=========================================="
echo ""

# 1. Restart networking
echo "1. Restarting network services..."
sudo service networking restart 2>/dev/null || echo "   (Skipped - may require sudo)"

# 2. Test DNS
echo ""
echo "2. Testing DNS resolution..."
if nslookup fullnode.testnet.sui.io > /dev/null 2>&1; then
    echo "   ✅ DNS resolution working"
else
    echo "   ❌ DNS resolution failed"
    echo "   Trying to fix DNS..."
    
    # Try to add Google DNS
    if [ -w /etc/resolv.conf ]; then
        echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf > /dev/null 2>&1
        echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null 2>&1
        echo "   Added Google DNS servers"
    else
        echo "   ⚠️  Cannot modify /etc/resolv.conf (WSL auto-generates it)"
        echo "   Try: sudo bash -c 'echo nameserver 8.8.8.8 > /etc/resolv.conf'"
    fi
fi

# 3. Test connectivity
echo ""
echo "3. Testing connectivity..."
if ping -c 1 -W 2 fullnode.testnet.sui.io > /dev/null 2>&1; then
    echo "   ✅ Ping successful"
else
    echo "   ❌ Ping failed"
fi

# 4. Test HTTPS
echo ""
echo "4. Testing HTTPS connection..."
if timeout 5 curl -s -I https://fullnode.testnet.sui.io:443 > /dev/null 2>&1; then
    echo "   ✅ HTTPS connection working"
else
    echo "   ❌ HTTPS connection failed"
fi

# 5. Try Sui command
echo ""
echo "5. Testing Sui client..."
if timeout 10 sui client active-env > /dev/null 2>&1; then
    echo "   ✅ Sui client working"
    echo ""
    echo "Try running: sui client balance"
else
    echo "   ❌ Sui client still having issues"
    echo ""
    echo "Possible solutions:"
    echo "  1. Restart WSL: In Windows PowerShell (admin): wsl --shutdown"
    echo "  2. Check Windows internet connection"
    echo "  3. Try again in a few minutes (might be temporary network issue)"
    echo "  4. Check if behind firewall/proxy"
fi

echo ""
echo "Done!"

