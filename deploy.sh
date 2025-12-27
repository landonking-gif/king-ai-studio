#!/bin/bash
set -e

# ==============================================================================
# OLLAMA MODEL CONFIGURATION
# ==============================================================================
# Primary model for complex reasoning (highest quality)
PRIMARY_MODEL="llama3.3:70b"
# Coding specialist model (smaller to save disk space)
CODING_MODEL="codellama:13b"
# Fast response model for simple tasks
FAST_MODEL="qwen2.5:14b"

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

# ==============================================================================
# MULTI-MODEL PULL
# ==============================================================================
# Check disk space before pulling models (~70GB total)
AVAILABLE_SPACE=$(df -BG --output=avail / | tail -1 | tr -d 'G ')
log "Available disk space: ${AVAILABLE_SPACE}GB"
if [ "$AVAILABLE_SPACE" -lt 80 ]; then
    log "⚠️ WARNING: Less than 80GB free. Model downloads may fail."
fi

log "📦 Pulling AI Models (this may take a while on first run)..."

# Primary Model - llama3.3:70b (~40GB)
log "  [1/3] Pulling $PRIMARY_MODEL (Complex Reasoning)..."
ollama pull $PRIMARY_MODEL || log "⚠️ Warning: Failed to pull $PRIMARY_MODEL"

# Coding Model - deepseek-coder:33b (~20GB)
log "  [2/3] Pulling $CODING_MODEL (Coding Expert)..."
ollama pull $CODING_MODEL || log "⚠️ Warning: Failed to pull $CODING_MODEL"

# Fast Model - qwen2.5:14b (~10GB)
log "  [3/3] Pulling $FAST_MODEL (Fast Responses)..."
ollama pull $FAST_MODEL || log "⚠️ Warning: Failed to pull $FAST_MODEL"

log "🎯 Available Ollama models:"
ollama list

# 3. APP DIRECTORY
APP_DIR="$HOME/king-ai-studio"
cd "$APP_DIR"

# 4. DEPENDENCIES
log "Installing NPM packages..."
npm install --no-audit --no-fund --production 2>&1 | tail -5
if ! npm install --no-audit --no-fund --production; then
    log "ERROR: npm install failed"
    exit 1
fi

# 5. DATABASE RESET (force fresh schema)
log "Resetting database for schema upgrade..."
rm -f "$APP_DIR/data/king-ai.db" 2>/dev/null || true

# 5.1 DATABASE MIGRATION
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

# 8. HEALTH CHECK (Wait for HTTP - extended for 70B model warmup)
log "Waiting for dashboard to respond (up to 60s for large model warmup)..."
MAX_ATTEMPTS=30
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
    log ""
    log "🤖 Installed Models:"
    log "   - $PRIMARY_MODEL (Complex reasoning, analysis)"
    log "   - $CODING_MODEL (Code generation, debugging)"
    log "   - $FAST_MODEL (Quick responses, simple tasks)"
else
    log "⚠️ WARNING: Dashboard not responding after 60s. Check $HOME/empire.log"
    tail -20 $HOME/empire.log
fi

log "=== DEPLOYMENT COMPLETE ==="
