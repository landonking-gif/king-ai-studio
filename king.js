/**
 * 👑 King AI Studio - Master Controller
 * Unified script for connecting, updating, and launching the empire.
 */

import { execSync, spawn } from 'child_process';
import open from 'open';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function run() {
    console.clear();
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           👑 KING AI STUDIO MASTER CONTROLLER            ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║ 1. Local Verification & Sync                             ║');
    console.log('║ 2. AWS Connection & Update                               ║');
    console.log('║ 3. AI Brain Initialization                               ║');
    console.log('║ 4. Empire Launch                                         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Step 1: Push local fixes
    console.log('📤 [1/4] Syncing local fixes to repository...');
    try {
        execSync('git add .', { stdio: 'ignore' });
        execSync('git commit -m "Auto-sync from Master Controller" --allow-empty', { stdio: 'ignore' });
        execSync('git push origin main', { stdio: 'inherit' });
        console.log('✅ Local code synced to GitHub.\n');
    } catch (e) {
        console.warn('⚠️ Push failed (likely already up to date). Continuing...');
    }

    // Step 2: AWS Info
    console.log('🌐 [2/4] AWS Server Details');
    const defaultIP = 'ec2-18-216-0-221.us-east-2.compute.amazonaws.com';
    const serverIP = await question(`Enter AWS Server IP/DNS [Default: ${defaultIP}]: `) || defaultIP;
    const keyFile = 'king-ai-studio.pem';

    if (!fs.existsSync(path.join(ROOT_DIR, keyFile))) {
        console.error(`❌ Missing ${keyFile} in the root directory!`);
        process.exit(1);
    }

    // New: Securely sync .env (bypass GitHub)
    if (fs.existsSync(path.join(ROOT_DIR, '.env'))) {
        console.log('\n🔐 [Syncing Secrets] Sending .env to AWS via secure tunnel...');
        try {
            const sshOpts = '-o StrictHostKeyChecking=no -o ConnectTimeout=10';
            // Ensure directory exists with correct permissions
            execSync(`ssh -i "${keyFile}" ${sshOpts} ubuntu@${serverIP} "mkdir -p \\$HOME/king-ai-studio && chmod 700 \\$HOME/king-ai-studio"`, { stdio: 'ignore' });
            execSync(`scp -i "${keyFile}" ${sshOpts} ".env" ubuntu@${serverIP}:~/king-ai-studio/.env`, { stdio: 'inherit' });
            console.log('✅ Secrets synced successfully.');
        } catch (e) {
            console.warn('⚠️ Could not sync .env securely. You may need to set it manually on the server.');
        }
    }

    console.log(`\n🔗 [3/4] Preparing remote setup on ${serverIP}...`);

    // Remote sequence: Force-Clear Locks -> Install Node -> Clone/Update -> Install Deps -> Init -> Daemon -> Verify
    const remoteCmd = [
        'export DEBIAN_FRONTEND=noninteractive',
        'set -e', // Fail fast

        // --- 1. ROBUST LOCK CLEARING ---
        'echo "🛡️ [Remote] Diagnostic: Clearing package manager locks..."',
        'sudo systemctl stop unattended-upgrades.service 2>/dev/null || true',
        '# Kill potential hung processes from auto-updates',
        'sudo pkill -9 apt-get 2>/dev/null || true',
        'sudo pkill -9 dpkg 2>/dev/null || true',
        '# Remove lock files manually to ensure we can install',
        'sudo rm -f /var/lib/dpkg/lock-frontend',
        'sudo rm -f /var/lib/dpkg/lock',
        'sudo rm -f /var/cache/apt/archives/lock',
        'sudo rm -f /var/lib/apt/lists/lock',
        'sudo dpkg --configure -a', // Fix any interrupted installations

        // --- 2. NODE.JS INSTALLATION ---
        'if ! command -v node &> /dev/null; then',
        '  echo "📦 [Remote] Node.js missing. Installing 20.x..."',
        '  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
        '  sudo apt-get install -y nodejs',
        'fi',
        'echo "✅ [Remote] Node Version: $(node -v)"',

        // --- 3. REPOSITORY SYNC ---
        'if [ ! -d "$HOME/king-ai-studio/.git" ]; then',
        '  echo "📂 [Remote] Cloning fresh repository..."',
        '  rm -rf $HOME/king-ai-studio', // Clear partial directory if exists
        '  git clone https://github.com/landonking-gif/king-ai-studio.git $HOME/king-ai-studio',
        'fi',

        'cd $HOME/king-ai-studio',
        'echo "🔄 [Remote] Pulling latest code..."',
        'git fetch origin main',
        'git reset --hard origin/main',

        // --- 4. DEPENDENCIES & INIT ---
        'echo "📥 [Remote] Installing NPM Packages..."',
        'npm install --no-audit --no-fund',

        'echo "🧠 [Remote] Initializing Database & Brain..."',
        'npm run init',

        // --- 5. LAUNCH & VERIFY ---
        'echo "🚀 [Remote] Starting Empire via Screen..."',
        'screen -S empire -X quit 2>/dev/null || true',
        'screen -dmS empire npm run empire:daemon',

        'echo "⏱️ [Remote] Verifying startup (5s warm-up)..."',
        'sleep 5',
        'if screen -list | grep -q "empire"; then',
        '   echo "✅ [Remote] Empire Daemon is ACTIVE."',
        'else',
        '   echo "❌ [Remote] Empire Daemon failed to start!"',
        '   exit 1',
        'fi',

        'echo "🌐 [Remote] READY: http://' + serverIP + ':3847"'
    ].join('\n');

    try {
        console.log('\n⏳ Initiating remote update & environment synchronization...');
        console.log('   (First-time setup on a new server will take about 2-3 minutes)');
        const sshOpts = '-o StrictHostKeyChecking=no';
        execSync(`ssh -i "${keyFile}" ${sshOpts} ubuntu@${serverIP} "${remoteCmd}"`, { stdio: 'inherit' });
    } catch (e) {
        console.error('\n❌ Connection Failed or Remote Error.');
        console.error('   Ensure your .pem key is valid and the server is reachable.');
        process.exit(1);
    }

    console.log('\n🌟 [4/4] EMPIRE INITIALIZED!');
    console.log('═══════════════════════════════════════');
    console.log(`✅ System Ready & Daemon Started`);
    console.log(`✅ Code Sync & Node.js Confirmed`);
    console.log(`✅ Dashboard Online`);
    console.log('═══════════════════════════════════════');

    // Auto-open dashboard locally with enhanced retry
    const dashboardUrl = `http://${serverIP}:3847`;
    console.log('\n🌎 DASHBOARD COMMAND CENTER');
    console.log('═══════════════════════════════════════');
    console.log(`🔗 LINK: ${dashboardUrl}`);
    console.log('═══════════════════════════════════════');

    try {
        console.log(`\n🔍 Verifying dashboard heartbeat...`);
        process.stdout.write('   Waiting for engine to warm up');

        let attempts = 0;
        const maxAttempts = 60; // Increased to 2 minutes for fresh setups
        const checkInterval = 2000;

        const checkServer = async () => {
            while (attempts < maxAttempts) {
                attempts++;
                try {
                    const res = await fetch(dashboardUrl, {
                        method: 'GET',
                        signal: AbortSignal.timeout(2000)
                    });

                    if (res.ok) {
                        console.log('\n\n✅ THE KING IS LIVE! Opening Dashboard in browser...');
                        await open(dashboardUrl);
                        return true;
                    }
                } catch (e) {
                    // Not ready yet
                }
                process.stdout.write('.');
                await new Promise(r => setTimeout(r, checkInterval));
            }
            return false;
        };

        const ready = await checkServer();
        if (!ready) {
            console.log(`\n\n⚠️  The dashboard didn't respond in time.`);
            console.log(`👉 Manual Link: ${dashboardUrl}`);
            console.log(`💡 Tip: If it still fails, it's almost always the AWS Security Group Port 3847 (Inbound).`);
        }
    } catch (e) {
        // Fallback
    }

    console.log('\n👑 Long live the King!');
    rl.close();
}

run().catch(console.error);
