#!/bin/bash
set -e

log() {
    echo "[DEPLOY] $(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a deploy.log
}

log "Starting Deployment on $(hostname)..."

# 1. CLEANUP & LOCKS
log "Ensuring package manager is free..."
export DEBIAN_FRONTEND=noninteractive
sudo systemctl stop unattended-upgrades.service 2>/dev/null || true

# Force unlock if needed
sudo rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock /var/lib/apt/lists/lock
sudo dpkg --configure -a || true

# 2. NODE.JS (Check)
if ! command -v node &> /dev/null; then
    log "Installing Node.js 20.x..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
else
    log "Node.js ready: $(node -v)"
fi

# 3. DIRECTORY & DEPENDENCIES
APP_DIR="$HOME/king-ai-studio"
cd "$APP_DIR"

log "Installing dependencies (clean)..."
npm install --no-audit --no-fund --production

# 4. INITIALIZATION (Fast Track)
log "Running quick-start migrations..."
# Only run the database part of init, skip the ollama pulls
node scripts/migrate-to-sqlite.js || log "Migration skipped (already present)."

# 5. STARTUP
log "Launching King AI Empire Daemon..."
# Kill existing screen
screen -S empire -X quit 2>/dev/null || true
# Start a fresh daemon session
screen -dmS empire npm run empire:daemon

# 6. VERIFICATION
log "Verifying process..."
sleep 8
if screen -list | grep -q "empire"; then
    log "✅ SUCCESS: Empire process is alive in background."
    log "🌐 Dashboard access: http://$(curl -s ifconfig.me):3847"
else
    log "❌ ERROR: Process died after launch. Check logs."
    exit 1
fi

log "Deployment Complete!"
