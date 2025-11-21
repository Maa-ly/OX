# Testing Walrus Publisher Integration

## Quick Test Checklist

### Before Starting

✅ **Wallet has WAL tokens** (you already did this)
✅ **WALRUS_PUBLISHER_URL is set** in `.env` to `http://127.0.0.1:31416`
✅ **Walrus CLI is installed** (`which walrus` should work)
✅ **Backend code is updated** with publisher integration

### What to Expect

When you start the backend, you should see:

1. **Backend starting logs:**
   ```
   Starting ODX Oracle Service...
   Metrics Collector initialized
   ```

2. **Publisher starting logs:**
   ```
   Starting Walrus publisher daemon...
     Bind Address: 127.0.0.1:31416
     Wallets Dir: /home/odeili/.config/walrus/publisher-wallets
     Context: testnet
   ✓ Walrus publisher daemon started (PID: xxxxx)
     Publisher available at: http://127.0.0.1:31416
   ```

3. **Backend ready:**
   ```
   ODX Oracle Service running on port 3000
   Server is ready to accept requests
   ```

### Test Steps

1. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Check logs for:**
   - Publisher daemon started successfully
   - Publisher PID is shown
   - No errors about walrus command not found

3. **Verify publisher is running:**
   ```bash
   # In another terminal
   ./scripts/publisher-status.sh
   ```

4. **Test posting a contribution:**
   - Use your frontend to post a contribution
   - Should work without "insufficient balance" errors
   - Check backend logs for successful storage

### Success Indicators

✅ **Publisher starts automatically** when backend starts
✅ **No "walrus command not found" errors**
✅ **Publisher shows PID in logs**
✅ **Posts work** without balance errors
✅ **Backend logs show successful blob storage**

### Common Issues & Fixes

#### Publisher doesn't start

**Symptom:** No publisher logs, or error about walrus not found

**Fix:**
```bash
# Check walrus is installed
which walrus

# If not found, create symlink (we did this earlier)
ln -sf ~/.local/share/suiup/binaries/testnet/walrus-v1.37.0 ~/.local/bin/walrus
```

#### "Using external publisher" message

**Symptom:** Logs say "Using external publisher, not starting local publisher daemon"

**Fix:**
```bash
# Check your .env file
grep WALRUS_PUBLISHER_URL .env

# Should be:
WALRUS_PUBLISHER_URL=http://127.0.0.1:31416
```

#### Publisher starts but posts still fail

**Symptom:** Publisher running but posts fail with balance errors

**Fix:**
```bash
# Check wallet has WAL tokens
sui client gas

# Get more WAL if needed
walrus get-wal
```

### What to Watch For

**Good Signs:**
- Publisher starts within 2 seconds of backend
- Publisher PID appears in logs
- No errors about walrus command
- Posts succeed

**Bad Signs:**
- No publisher logs at all
- Errors about walrus not found
- "Using external publisher" when you want local
- Posts still fail with balance errors

### Testing Workflow

1. ✅ **Start backend:** `npm start`
2. ✅ **Check logs** for publisher startup
3. ✅ **Verify status:** `./scripts/publisher-status.sh`
4. ✅ **Test post** from frontend
5. ✅ **Check logs** for successful storage

### Next Steps After Testing

If everything works:
- ✅ Publisher is integrated and ready for production!
- ✅ Your wallet will pay for all user posts
- ✅ No separate publisher management needed

If something doesn't work:
- Check the error messages in logs
- Verify configuration
- Check wallet balance
- See troubleshooting section above

