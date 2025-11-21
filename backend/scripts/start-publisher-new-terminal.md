# How to Start Walrus Publisher in Another Terminal

## Quick Start

### Option 1: New Terminal Window (Recommended for Development)

1. **Open a new terminal window/tab**

2. **Navigate to the backend directory:**
   ```bash
   cd ~/project_career_build/Manga/OX/backend
   ```

3. **Start the publisher:**
   ```bash
   ./scripts/start-walrus-publisher.sh
   ```

4. **The publisher will start and show logs in this terminal**
   - You'll see configuration info
   - Logs will appear as requests come in
   - Press `Ctrl+C` to stop it

### Option 2: Run in Background (For Production)

If you want it running in the background (no visible terminal):

```bash
cd ~/project_career_build/Manga/OX/backend
nohup ./scripts/start-walrus-publisher.sh > walrus-publisher.log 2>&1 &
```

Then check logs with:
```bash
tail -f walrus-publisher.log
```

### Option 3: Using screen (Persistent Session)

```bash
# Start a screen session
screen -S walrus-publisher

# In the screen session
cd ~/project_career_build/Manga/OX/backend
./scripts/start-walrus-publisher.sh

# Detach: Press Ctrl+A then D
# Reattach: screen -r walrus-publisher
# Kill: screen -X -S walrus-publisher quit
```

### Option 4: Using tmux (Alternative to screen)

```bash
# Start a tmux session
tmux new -s walrus-publisher

# In the tmux session
cd ~/project_career_build/Manga/OX/backend
./scripts/start-walrus-publisher.sh

# Detach: Press Ctrl+B then D
# Reattach: tmux attach -t walrus-publisher
# Kill: tmux kill-session -t walrus-publisher
```

## Check if Publisher is Already Running

Before starting, check if it's already running:

```bash
# Check if process is running
ps aux | grep "walrus publisher" | grep -v grep

# Check if port is in use
lsof -i :31416

# Or use the status script
cd ~/project_career_build/Manga/OX/backend
./scripts/publisher-status.sh
```

## Stop Existing Publisher

If you need to stop an existing publisher:

```bash
# Find and kill the process
pkill -f "walrus publisher"

# Or kill by PID (if you know it)
kill <PID>

# Or use the status script to find it first
./scripts/publisher-status.sh
```

## Full Example (New Terminal)

```bash
# 1. Open new terminal
# 2. Run these commands:

cd ~/project_career_build/Manga/OX/backend

# Check if already running
./scripts/publisher-status.sh

# If not running, start it
./scripts/start-walrus-publisher.sh

# You should see:
# Starting Walrus Publisher Daemon...
# Configuration:
#   Bind Address: 127.0.0.1:31416
#   ...
# Starting publisher daemon...
# Publisher will be available at: http://127.0.0.1:31416
```

## For Production (systemd Service)

See `WALRUS_PUBLISHER_SETUP.md` for how to set up as a systemd service that starts automatically.

