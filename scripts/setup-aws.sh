#!/bin/bash
# setup-aws.sh - Automated setup for King AI Studio on AWS Ubuntu

echo "🚀 Starting King AI Studio Setup on AWS..."

# 1. Update and install basic dependencies
sudo apt-get update
sudo apt-get install -y curl git build-essential

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 4. Wait for Ollama to start and pull models
echo "⏳ Waiting for Ollama service..."
sleep 5
# Pulling models recommended by ModelRouter
ollama pull deepseek-r1:8b
ollama pull llama3.1:8b
ollama pull codellama:7b

# 5. Install PM2 for process management
sudo npm install -g pm2

# 6. Setup Project (Assuming files are transferred)
if [ -f "package.json" ]; then
    echo "📦 Installing project dependencies..."
    npm install
fi

echo "✅ Setup Complete!"
echo "-------------------------------------------------------"
echo "To start the system, run:"
echo "pm2 start empire.js --name king-ai -- --daemon"
echo "-------------------------------------------------------"
echo "To view logs: pm2 logs king-ai"
echo "To interact: node empire.js"
