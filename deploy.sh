#!/bin/bash
set -e

# Define logging
log() {
    echo "[DEPLOY] $1"
}

log "Starting Deployment on $(hostname)..."

# 1. CLEANUP & LOCKS
log "Ensuring package manager is free..."
export DEBIAN_FRONTEND=noninteractive
sudo systemctl stop unattended-upgrades.service 2>/dev/null || true
# Kill specific interfering processes only if they exist
for proc in apt apt-get dpkg; do
    if pgrep -x "$proc" >/dev/null; then
        log "Killing stuck $proc..."
        sudo pkill -9 "$proc" || true
    fi
done

# Remove stale locks
sudo rm -f /var/lib/dpkg/lock-frontend
sudo rm -f /var/lib/dpkg/lock
sudo rm -f /var/cache/apt/archives/lock
sudo rm -f /var/lib/apt/lists/lock
# Configure any partial installs
sudo dpkg --configure -a || true

# 2. NODE.JS INSTALLATION
if ! command -v node &> /dev/null; then
    log "Node.js not found. Installing Node 20.x..."
    # Update first to ensure curl exists
    sudo apt-get update -qq
    sudo apt-get install -y -qq curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
else
    log "Node.js is already installed: $(node -v)"
fi

# 3. DIRECTORY SETUP
APP_DIR="$HOME/king-ai-studio"
if [ ! -d "$APP_DIR/.git" ]; then
    log "Project directory missing or invalid. Cloning fresh..."
    rm -rf "$APP_DIR"
    git clone https://github.com/landonking-gif/king-ai-studio.git "$APP_DIR"
else
    log "Project directory exists. Pulling latest..."
    cd "$APP_DIR"
    git fetch origin main || { log "Git fetch failed, re-cloning..."; cd ..; rm -rf "$APP_DIR"; git clone https://github.com/landonking-gif/king-ai-studio.git "$APP_DIR"; }
    cd "$APP_DIR"
    # Ensure we are on main
    git checkout main
    git reset --hard origin/main
fi

cd "$APP_DIR"

# 4. DEPENDENCIES
log "Installing dependencies..."
npm install --no-audit --no-fund

# 5. INITIALIZATION
log "Initializing AI Brain..."
npm run init

# 6. STARTUP
log "Restarting Empire Service..."
# Kill existing screen if running
screen -S empire -X quit 2>/dev/null || true
# Start new session
screen -dmS empire npm run empire:daemon

# 7. VERIFICATION
log "Verifying deployment..."
sleep 5
if screen -list | grep -q "empire"; then
    log "✅ SUCCESS: Empire process is running."
else
    log "❌ ERROR: Empire process failed to start."
    exit 1
fi

log "Deployment Complete!"
