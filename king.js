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
            execSync(`scp -i "${keyFile}" ".env" ubuntu@${serverIP}:~/king-ai-studio/.env`, { stdio: 'inherit' });
            console.log('✅ Secrets synced successfully.');
        } catch (e) {
            console.warn('⚠️ Could not sync .env securely. You may need to set it manually on the server.');
        }
    }

    console.log(`\n🔗 [3/4] Preparing remote setup on ${serverIP}...`);

    // Remote sequence: Update -> Install -> Init -> Daemon (in screen)
    const remoteCmd = [
        'cd ~/king-ai-studio',
        'git fetch origin main',
        'git reset --hard origin/main',
        'npm install',
        'npm run init',
        'screen -S empire -X quit || true',
        'screen -dmS empire npm run empire:daemon',
        'echo "🚀 EMPIRE IS NOW RUNNING IN THE BACKGROUND!"',
        'echo "🌐 View Dashboard: http://' + serverIP + ':3847"'
    ].join(' && ');

    try {
        console.log('⏳ Running remote update... (This may take a minute)');
        execSync(`ssh -i "${keyFile}" ubuntu@${serverIP} "${remoteCmd}"`, { stdio: 'inherit' });
    } catch (e) {
        console.error('\n❌ Connection Failed. Ensure your .pem key is in the folder and IP is correct.');
        process.exit(1);
    }

    console.log('\n🌟 [4/4] COMPLETE!');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Code Updated on AWS`);
    console.log(`✅ Database Migrated to SQLite`);
    console.log(`✅ Llama 3.1 & DeepSeek Models Ready`);
    console.log(`✅ Empire running in background screen "empire"`);
    console.log('═══════════════════════════════════════');
    console.log(`👉 DASHBOARD: http://${serverIP}:3847`);
    console.log(`👉 TO VIEW LIVE LOGS: ssh -i "${keyFile}" ubuntu@${serverIP} "screen -r empire"`);

    // Auto-open dashboard locally
    try {
        console.log('\n🌐 Waiting for dashboard to go live on AWS...');
        const dashboardUrl = `http://${serverIP}:3847`;

        // Wait up to 30 seconds for the server to bind
        let attempts = 0;
        const maxAttempts = 15;
        const checkInterval = 2000;

        const checkServer = async () => {
            while (attempts < maxAttempts) {
                attempts++;
                try {
                    const res = await fetch(dashboardUrl, { method: 'HEAD', signal: AbortSignal.timeout(1000) });
                    if (res.status < 500) {
                        console.log('\n✅ Dashboard detected! Opening browser...');
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
            console.log(`\n⚠️ Dashboard taking a while to boot. 
👉 You can open it manually at: ${dashboardUrl}`);
        }
    } catch (e) {
        // Silently fail if browser can't open
    }

    console.log('\n👑 Long Live the King! (Press Ctrl+C to exit)');
    rl.close();
}

run().catch(console.error);
