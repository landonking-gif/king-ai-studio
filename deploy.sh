#!/bin/bash
set -e

# Logging helper
log() {
    echo "[DEPLOY] $(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a $HOME/deploy.log
}

log "=== DEPLOYMENT START ==="
log "Host: $(hostname)"

# 1. PACKAGE MANAGER CLEANUP
log "Clearing package manager locks..."
export DEBIAN_FRONTEND=noninteractive
sudo systemctl stop unattended-upgrades.service 2>/dev/null || true
sudo rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock /var/lib/apt/lists/lock
sudo dpkg --configure -a 2>/dev/null || true

# 2. NODE.JS CHECK
if ! command -v node &> /dev/null; then
    log "Installing Node.js 20.x..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
    sudo apt-get install -y -qq build-essential
else
    log "Node.js: $(node -v)"
fi

# 2.5 OLLAMA SETUP
if ! command -v ollama &> /dev/null; then
    log "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    log "Ollama already installed."
fi

# Ensure Ollama Service is running
if ! pgrep -x "ollama" > /dev/null; then
    log "Starting Ollama Service..."
    nohup ollama serve > /dev/null 2>&1 &
    sleep 5 # Give it a moment to bind
else
    log "Ollama service is running."
fi

# Pull the model (idempotent - skips if already exists)
log "Ensuring llama3.1:8b model is available..."
ollama pull llama3.1:8b || log "⚠️ Warning: Failed to pull model. Check internet/disk."

# 3. APP DIRECTORY
APP_DIR="$HOME/king-ai-studio"
cd "$APP_DIR"

# 4. DEPENDENCIES
log "Installing NPM packages..."
npm install --no-audit --no-fund --production 2>&1 | tail -5

# 5. DATABASE MIGRATION
log "Running database migration..."
node scripts/migrate-to-sqlite.js 2>&1 || log "Migration skipped or already done."

# 6. STOP OLD PROCESS
log "Stopping any existing Empire process..."
pkill -f "npm run empire:daemon" 2>/dev/null || true
pkill -f "node empire.js" 2>/dev/null || true
screen -S empire -X quit 2>/dev/null || true
sleep 2

# 7. START WITH NOHUP (Resilient)
log "Starting Empire Daemon via nohup..."
nohup npm run empire:daemon > $HOME/empire.log 2>&1 &
EMPIRE_PID=$!
log "Empire PID: $EMPIRE_PID"

# 8. HEALTH CHECK (Wait for HTTP)
log "Waiting for dashboard to respond (up to 30s)..."
MAX_ATTEMPTS=15
ATTEMPT=0
DASHBOARD_UP=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
    
    # Check if process is still alive
    if ! ps -p $EMPIRE_PID > /dev/null 2>&1; then
        log "ERROR: Empire process crashed! Check $HOME/empire.log"
        tail -30 $HOME/empire.log
        exit 1
    fi
    
    # Check HTTP response
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3847 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        DASHBOARD_UP=true
        break
    fi
    log "  Attempt $ATTEMPT/$MAX_ATTEMPTS - HTTP $HTTP_CODE"
done

if [ "$DASHBOARD_UP" = true ]; then
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    log "✅ SUCCESS: Dashboard is LIVE!"
    log "🌐 Dashboard URL: http://$PUBLIC_IP:3847"
else
    log "⚠️ WARNING: Dashboard not responding after 30s. Check $HOME/empire.log"
    tail -20 $HOME/empire.log
    # Don't exit 1 here - process might still be starting
fi

log "=== DEPLOYMENT COMPLETE ==="
