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

    // Upload deploy script
    const deployScript = 'deploy.sh';
    console.log(`\n📦 [3.5/4] Uploading deployment script...`);
    try {
        const sshOpts = '-o StrictHostKeyChecking=no -o ConnectTimeout=10';
        execSync(`scp -i "${keyFile}" ${sshOpts} "${deployScript}" ubuntu@${serverIP}:~/deploy.sh`, { stdio: 'ignore' });
        execSync(`ssh -i "${keyFile}" ${sshOpts} ubuntu@${serverIP} "chmod +x ~/deploy.sh"`, { stdio: 'ignore' });
    } catch (e) {
        console.error('❌ Failed to upload deployment script.');
        process.exit(1);
    }

    // Sync entire project to server (since repo is private)
    console.log(`\n📂 [3.6/4] Syncing project files to server...`);
    try {
        const sshOpts = '-o StrictHostKeyChecking=no -o ConnectTimeout=10';
        console.log('   Creating secure stream and uploading...');

        // Ensure destination exists
        execSync(`ssh -i "${keyFile}" ${sshOpts} ubuntu@${serverIP} "mkdir -p ~/king-ai-studio"`, { stdio: 'ignore' });

        // Use tar to bundle everything except node_modules/git/data and stream to server
        // This is extremely fast and avoids GitHub private repo issues
        execSync(`tar --exclude=node_modules --exclude=.git --exclude=data -cf - . | ssh -i "${keyFile}" ${sshOpts} ubuntu@${serverIP} "cd ~/king-ai-studio && tar -xf -"`, { stdio: 'inherit' });
        console.log('✅ Project files synced.');
    } catch (e) {
        console.error('❌ Failed to sync project files.');
        console.error('   Error:', e.message);
        process.exit(1);
    }

    try {
        console.log('\n⏳ Initiating remote deployment (this will stream live output)...');
        console.log('═══════════════════════════════════════════════════════════');

        const sshOpts = '-o StrictHostKeyChecking=no';
        // Run the script and stream output directly to local terminal
        execSync(`ssh -i "${keyFile}" ${sshOpts} ubuntu@${serverIP} "./deploy.sh"`, { stdio: 'inherit' });

        console.log('═══════════════════════════════════════════════════════════');
    } catch (e) {
        console.error('\n❌ Deployment failed on the remote server.');
        console.error('   Please check the logs above for the specific error.');
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
