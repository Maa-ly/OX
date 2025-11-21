# Walrus Publisher Integration with Backend

The Walrus publisher daemon is now **integrated into your backend**! When you start your backend, it automatically starts the publisher daemon as part of the same process.

## How It Works

1. **Backend starts** → `src/server.js` initializes
2. **Publisher Manager starts** → Automatically starts Walrus publisher daemon
3. **Both run together** → Backend and publisher in the same process
4. **Graceful shutdown** → When backend stops, publisher stops too

## Configuration

### Enable/Disable Publisher Auto-Start

By default, the publisher starts automatically when the backend starts.

**To disable auto-start:**
```bash
# In .env file
START_WALRUS_PUBLISHER=false

# Or when starting
START_WALRUS_PUBLISHER=false npm start
```

**To explicitly enable:**
```bash
# In .env file
START_WALRUS_PUBLISHER=true

# Or when starting
START_WALRUS_PUBLISHER=true npm start
```

### Publisher URL Configuration

The publisher manager checks if you're using a local publisher:

```bash
# In .env - these will auto-start publisher:
WALRUS_PUBLISHER_URL=http://127.0.0.1:31416
WALRUS_PUBLISHER_URL=http://localhost:31416

# In .env - these will NOT auto-start (using external publisher):
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=http://your-server-ip:31416
```

### Other Configuration Options

```bash
# Custom walrus binary path (if not in PATH)
WALRUS_BINARY_PATH=/path/to/walrus

# Publisher wallets directory
WALRUS_PUBLISHER_WALLETS_DIR=~/.config/walrus/publisher-wallets

# Number of sub-wallets for parallel requests
WALRUS_PUBLISHER_N_CLIENTS=5

# Walrus config path
WALRUS_CONFIG_PATH=~/.config/walrus/client_config.yaml

# Walrus context
WALRUS_CONTEXT=testnet
```

## Starting the Backend

### Development
```bash
npm start
# or
npm run dev
```

The publisher will automatically start with the backend!

### Production
```bash
# Start normally (publisher auto-starts)
npm start

# Or explicitly enable/disable
START_WALRUS_PUBLISHER=true npm start
START_WALRUS_PUBLISHER=false npm start
```

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start backend (publisher auto-starts)
pm2 start src/server.js --name odx-backend

# Or with environment variables
pm2 start src/server.js --name odx-backend --env production
```

## Monitoring

### Check Publisher Status

The backend logs will show publisher status on startup:

```
Starting Walrus publisher daemon...
  Bind Address: 127.0.0.1:31416
  Wallets Dir: /home/user/.config/walrus/publisher-wallets
  Context: testnet
✓ Walrus publisher daemon started (PID: 12345)
  Publisher available at: http://127.0.0.1:31416
```

### Check if Publisher is Running

```bash
# From your backend directory
./scripts/publisher-status.sh

# Or check process
ps aux | grep "walrus publisher"

# Or check port
lsof -i :31416
```

## Benefits

1. **Simple Deployment**: Just start your backend, publisher starts automatically
2. **Same Process**: Publisher runs as part of backend (no separate service needed)
3. **Graceful Shutdown**: Stopping backend stops publisher cleanly
4. **Production Ready**: Works in production environments (PM2, systemd, etc.)
5. **Automatic Management**: No need to manage publisher separately

## Troubleshooting

### Publisher Won't Start

**Check:**
1. Is `walrus` command available? (`which walrus`)
2. Is `START_WALRUS_PUBLISHER` set to `false`?
3. Are you using a local publisher URL? (127.0.0.1 or localhost)
4. Check backend logs for error messages

**Solution:**
```bash
# Check walrus is installed
which walrus

# Check environment variable
echo $START_WALRUS_PUBLISHER

# Check publisher URL
grep WALRUS_PUBLISHER_URL .env
```

### Publisher Starts But Backend Can't Connect

**Check:**
1. Is publisher URL correct in `.env`?
2. Is publisher actually running? (`./scripts/publisher-status.sh`)
3. Check backend logs for connection errors

**Solution:**
```bash
# Verify publisher is running
./scripts/publisher-status.sh

# Check if URL matches
curl http://127.0.0.1:31416/
```

### Graceful Shutdown Issues

If the publisher doesn't stop cleanly:
- Check backend logs for shutdown messages
- Publisher should stop within 5 seconds
- Force kill if needed: `pkill -f 'walrus publisher'`

## Production Deployment

For production, the publisher runs as part of your backend process:

1. **Deploy your backend** (Vercel, AWS, etc.)
2. **Publisher starts automatically** with backend
3. **Both run in the same process**
4. **No separate publisher service needed**

### Example: Vercel/Serverless

Note: If using serverless (Vercel, AWS Lambda), the publisher may not work due to binary execution limits. In that case:

```bash
# Disable auto-start and use external publisher
START_WALRUS_PUBLISHER=false
WALRUS_PUBLISHER_URL=https://your-publisher-server.com
```

### Example: Traditional Server (PM2, systemd)

The integrated publisher works perfectly:

```bash
# PM2
pm2 start src/server.js --name backend

# systemd (your backend service)
# Publisher will auto-start when backend starts
```

## Summary

✅ **Publisher is now part of your backend**
✅ **Starts automatically when backend starts**
✅ **Stops automatically when backend stops**
✅ **No separate service management needed**
✅ **Production ready**

Just run `npm start` and everything works!

