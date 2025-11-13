# Network Connection Troubleshooting

## Error: DNS Resolution Failure

You're getting this error:
```
dns error: failed to lookup address information: Temporary failure in name resolution
```

This means your system can't resolve the DNS for the Sui testnet RPC endpoint.

## Solutions

### Solution 1: Check Internet Connection

```bash
# Test basic connectivity
ping -c 3 8.8.8.8

# Test DNS resolution
nslookup fullnode.testnet.sui.io
```

### Solution 2: Fix WSL2 DNS (If using WSL)

WSL2 sometimes has DNS issues. Try:

```bash
# Restart WSL networking
sudo service networking restart

# Or restart the entire WSL instance
# In Windows PowerShell (as admin):
# wsl --shutdown
# Then restart WSL
```

### Solution 3: Use Alternative DNS Servers

Edit `/etc/resolv.conf`:

```bash
sudo nano /etc/resolv.conf
```

Add:
```
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
```

**Note:** In WSL, this file might be auto-generated. To make it permanent:

```bash
# Create a script to fix DNS
sudo bash -c 'cat > /etc/wsl.conf' << EOF
[network]
generateResolvConf = false
EOF

# Then edit resolv.conf
sudo rm /etc/resolv.conf
sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
sudo bash -c 'echo "nameserver 8.8.4.4" >> /etc/resolv.conf'
```

### Solution 4: Check Sui Client Configuration

Verify your RPC endpoint is correct:

```bash
cat ~/.sui/sui_config/client.yaml
```

The RPC should be: `https://fullnode.testnet.sui.io:443`

### Solution 5: Try Alternative RPC Endpoint

If the default doesn't work, you can try alternative endpoints:

1. **Sui Foundation RPC:**
   - `https://fullnode.testnet.sui.io:443` (default)

2. **Alternative endpoints** (if available):
   - Check Sui documentation for backup RPCs

### Solution 6: Check Firewall/Proxy

If you're behind a corporate firewall or proxy:

```bash
# Check if proxy is set
echo $HTTP_PROXY
echo $HTTPS_PROXY

# If needed, configure proxy for Sui
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
```

### Solution 7: Test Connection Directly

```bash
# Test HTTPS connection
curl -v https://fullnode.testnet.sui.io:443

# Or test with wget
wget --spider https://fullnode.testnet.sui.io:443
```

## Quick Fix Script

Run the automated fix script:

```bash
./FIX_DNS_ISSUE.sh
```

This will test and attempt to fix DNS/network issues automatically.

## Manual Quick Fix Commands

Run these in order:

```bash
# 1. Restart networking
sudo service networking restart

# 2. Test DNS
nslookup fullnode.testnet.sui.io

# 3. Test connectivity
curl -I https://fullnode.testnet.sui.io:443

# 4. Try Sui command again
sui client balance
```

## WSL-Specific Fix

If you're on WSL2 and DNS keeps failing:

1. **Restart WSL completely:**
   ```powershell
   # In Windows PowerShell (as Administrator):
   wsl --shutdown
   ```
   Then restart your WSL terminal.

2. **Fix DNS permanently in WSL:**
   ```bash
   sudo bash -c 'cat > /etc/wsl.conf' << EOF
   [network]
   generateResolvConf = false
   EOF
   
   sudo rm /etc/resolv.conf
   sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
   sudo bash -c 'echo "nameserver 8.8.4.4" >> /etc/resolv.conf'
   ```
   
   Then restart WSL again.

## If Nothing Works

1. **Restart WSL completely:**
   - In Windows PowerShell (as admin): `wsl --shutdown`
   - Restart your WSL terminal

2. **Check Windows network settings:**
   - Ensure Windows has internet connectivity
   - WSL2 uses Windows networking

3. **Try from Windows directly:**
   - Install Sui CLI on Windows
   - Or use WSL1 instead of WSL2 (if possible)

## After Fixing Network

Once connectivity is restored:

1. Check balance:
   ```bash
   sui client balance
   ```

2. Get testnet tokens:
   ```bash
   sui client faucet
   ```

3. Deploy contract:
   ```bash
   sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps
   ```

