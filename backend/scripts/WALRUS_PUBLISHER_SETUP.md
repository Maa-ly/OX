# Walrus Publisher Setup Guide

This guide explains how to set up your own Walrus publisher so your backend can pay for user posts.

## Why Run Your Own Publisher?

- **Your wallet pays**: The publisher uses YOUR wallet (ADMIN_PRIVATE_KEY) to pay for storage
- **Full control**: You control the publisher, not dependent on public services
- **Production ready**: Required for production deployments
- **Cost management**: You manage WAL token costs directly

## Prerequisites

1. **Walrus CLI installed**: `walrus` command should be available
2. **Wallet with WAL tokens**: Your wallet (from ADMIN_PRIVATE_KEY) needs WAL tokens
3. **Sui wallet configured**: Wallet should be in `~/.sui/sui_config/client.yaml`

## Quick Start

### 1. Fund Your Wallet with WAL Tokens

```bash
# Make sure you have testnet SUI
sui client faucet

# Exchange SUI for WAL tokens (1:1 rate)
walrus get-wal

# Check your balance
sui client gas
```

### 2. Start the Publisher

```bash
# From the backend directory
cd backend
./scripts/start-walrus-publisher.sh
```

The publisher will start on `http://127.0.0.1:31416` by default.

### 3. Update Backend Configuration

Set the environment variable to use your publisher:

```bash
# In your .env file or environment
export WALRUS_PUBLISHER_URL=http://127.0.0.1:31416
```

Or for production (if publisher is on a different server):

```bash
export WALRUS_PUBLISHER_URL=http://your-server-ip:31416
```

### 4. Restart Your Backend

Restart your backend server to pick up the new publisher URL.

## Configuration Options

You can customize the publisher by setting environment variables:

```bash
# Bind address (default: 127.0.0.1:31416)
export WALRUS_PUBLISHER_BIND=0.0.0.0:31416  # Listen on all interfaces

# Wallets directory (default: ~/.config/walrus/publisher-wallets)
export WALRUS_PUBLISHER_WALLETS_DIR=/path/to/wallets

# Number of sub-wallets for parallel requests (default: 1)
export WALRUS_PUBLISHER_N_CLIENTS=5

# Config path (default: ~/.config/walrus/client_config.yaml)
export WALRUS_CONFIG_PATH=/path/to/config.yaml

# Context (default: testnet)
export WALRUS_CONTEXT=testnet
```

## Running as a Service (Production)

For production, you'll want to run the publisher as a systemd service or similar.

### systemd Service Example

Create `/etc/systemd/system/walrus-publisher.service`:

```ini
[Unit]
Description=Walrus Publisher Daemon
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/your/project/backend
Environment="WALRUS_PUBLISHER_BIND=0.0.0.0:31416"
Environment="WALRUS_PUBLISHER_WALLETS_DIR=/home/your-user/.config/walrus/publisher-wallets"
ExecStart=/home/your-user/.local/bin/walrus publisher --bind-address 0.0.0.0:31416 --sub-wallets-dir /home/your-user/.config/walrus/publisher-wallets --n-clients 5 --config /home/your-user/.config/walrus/client_config.yaml --context testnet
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable walrus-publisher
sudo systemctl start walrus-publisher
sudo systemctl status walrus-publisher
```

## Security Considerations

1. **Firewall**: Only expose the publisher port to your backend server, not publicly
2. **Authentication**: Consider setting up JWT authentication for production
3. **Monitoring**: Monitor WAL token balance and set up alerts
4. **Backup**: Keep backups of your wallet configuration

## Troubleshooting

### Publisher won't start

- Check if port is already in use: `lsof -i :31416`
- Verify walrus command exists: `which walrus`
- Check wallet has WAL tokens: `sui client gas`

### "Insufficient balance" errors

- Fund your wallet: `walrus get-wal`
- Check balance: `sui client gas`
- Verify wallet in config matches ADMIN_PRIVATE_KEY

### Backend can't connect

- Check publisher is running: `curl http://127.0.0.1:31416/health` (if health endpoint exists)
- Verify WALRUS_PUBLISHER_URL is set correctly
- Check firewall rules

## Cost Estimation

- Small contributions (JSON): ~0.001-0.01 WAL per post
- Medium files: ~0.01-0.1 WAL per file
- Large files: ~0.1-1 WAL per file

Monitor your WAL balance and refill as needed:
```bash
walrus get-wal --amount 10.0  # Exchange 10 SUI for 10 WAL
```

## References

- [Walrus Operator Guide](https://docs.wal.app/operator-guide/publisher.html)
- [Walrus Setup](https://docs.wal.app/usage/setup.html)
- [Authenticated Publisher](https://docs.wal.app/operator-guide/auth-publisher.html)

