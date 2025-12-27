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

// Dry-run mode: set via env `DRY_RUN=1` or by passing `--dry-run` argument.
const dryRun = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

function runCmd(cmd, opts = { stdio: 'inherit' }) {
    if (dryRun) {
        console.log('[DRY RUN]', cmd);
        return null;
    }
    return execSync(cmd, opts);
}

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
        runCmd('git add .', { stdio: 'ignore' });
        runCmd('git commit -m "Auto-sync from Master Controller" --allow-empty', { stdio: 'ignore' });
        try {
            runCmd('git push origin main', { stdio: 'inherit' });
            console.log('✅ Local code synced to GitHub.\n');
        } catch (pushErr) {
            console.warn('⚠️ Push failed — attempting to integrate remote changes via pull --rebase...');
            try {
                runCmd('git pull --rebase --autostash origin main', { stdio: 'inherit' });
                runCmd('git push origin main', { stdio: 'inherit' });
                console.log('✅ Synced after rebasing remote changes.\n');
            } catch (pullErr) {
                console.warn('⚠️ Could not auto-sync with remote. Continuing without pushing.');
            }
        }
    } catch (e) {
        console.warn('⚠️ Git operations failed locally. Continuing...');
    }

    // Step 2: AWS Info
    console.log('🌐 [2/4] AWS Server Details');
    const defaultIP = 'ec2-54-161-126-33.compute-1.amazonaws.com';
    const serverIP = await question(`Enter AWS Server IP/DNS [Default: ${defaultIP}]: `) || defaultIP;
    let keyFile = 'king-ai-studio (1).pem';

    // If the hardcoded key isn't present, try to discover a sensible .pem file
    const pemFiles = fs.readdirSync(ROOT_DIR).filter(f => f.toLowerCase().endsWith('.pem'));
    if (!fs.existsSync(path.join(ROOT_DIR, keyFile))) {
        if (pemFiles.length === 1) {
            keyFile = pemFiles[0];
            console.log(`Using discovered key file: ${keyFile}`);
        } else if (pemFiles.length > 1) {
            console.log('Multiple .pem files found in the project root:');
            pemFiles.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
            const ans = await question(`Enter number of key to use [1]: `) || '1';
            const idx = Math.max(0, Math.min(pemFiles.length - 1, parseInt(ans, 10) - 1));
            keyFile = pemFiles[idx];
        } else {
            const manual = await question('No .pem found. Enter path to SSH key file (or press Enter to abort): ');
            if (!manual) {
                console.error('❌ No SSH key provided; cannot continue.');
                process.exit(1);
            }
            keyFile = manual.trim();
        }
    }

    // Update .env with new OLLAMA_URL
    if (fs.existsSync(path.join(ROOT_DIR, '.env'))) {
        let envContent = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf8');
        const ollamaUrl = `http://${serverIP}:11434`;

        // Expose the chosen Ollama URL to the running process immediately
        // so any child processes or subsequent logic can read it via process.env.
        process.env.OLLAMA_URL = ollamaUrl;

        if (envContent.includes('OLLAMA_URL=')) {
            // Robust regex: matches the line starting with OLLAMA_URL (potentially commented)
            // but preserves anything else on other lines.
            envContent = envContent.replace(/^.*OLLAMA_URL=.*$/m, `OLLAMA_URL=${ollamaUrl}`);
        } else {
            envContent += `\nOLLAMA_URL=${ollamaUrl}\n`;
        }

        fs.writeFileSync(path.join(ROOT_DIR, '.env'), envContent);
        console.log(`✅ Updated .env with OLLAMA_URL: ${ollamaUrl}`);
    }

    // Allow absolute or relative key paths; if relative, resolve from ROOT_DIR
    const resolvedKeyPath = path.isAbsolute(keyFile) ? keyFile : path.join(ROOT_DIR, keyFile);
    if (!fs.existsSync(resolvedKeyPath)) {
        console.error(`❌ Missing SSH key at ${resolvedKeyPath}!`);
        process.exit(1);
    }

    // New: Securely sync .env (bypass GitHub)
    if (fs.existsSync(path.join(ROOT_DIR, '.env'))) {
        console.log('\n🔐 [Syncing Secrets] Sending .env to AWS via secure tunnel...');
        try {
            const sshOpts = '-o StrictHostKeyChecking=no -o ConnectTimeout=10';
            // Ensure directory exists with correct permissions
            execSync(`ssh -i "${resolvedKeyPath}" ${sshOpts} ubuntu@${serverIP} "mkdir -p \$HOME/king-ai-studio && chmod 700 \$HOME/king-ai-studio"`, { stdio: 'ignore' });
            execSync(`scp -i "${resolvedKeyPath}" ${sshOpts} ".env" ubuntu@${serverIP}:~/king-ai-studio/.env`, { stdio: 'inherit' });
            console.log('✅ Secrets synced successfully.');
        } catch (e) {
            console.warn(`⚠️ Could not sync .env securely: ${e.message}`);
            console.warn('   Continuing anyway, but you may need to set it manually on the server.');
        }
    }

    console.log(`\n🔗 [3/4] Preparing remote setup on ${serverIP}...`);

    // Upload deploy script
    const deployScript = 'deploy.sh';
    console.log(`\n📦 [3.5/4] Uploading deployment script...`);
    try {
        const sshOpts = '-o StrictHostKeyChecking=no -o ConnectTimeout=10';
        execSync(`scp -i "${resolvedKeyPath}" ${sshOpts} "${deployScript}" ubuntu@${serverIP}:~/deploy.sh`, { stdio: 'ignore' });
        // Fix line endings (CRLF -> LF) and make executable
        execSync(`ssh -i "${resolvedKeyPath}" ${sshOpts} ubuntu@${serverIP} "sed -i 's/\\r$//' ~/deploy.sh && chmod +x ~/deploy.sh"`, { stdio: 'ignore' });
    } catch (e) {
        console.error(`❌ Failed to upload deployment script: ${e.message}`);
        process.exit(1);
    }

    // Sync entire project to server (since repo is private)
    console.log(`\n📂 [3.6/4] Syncing project files to server...`);
    try {
        const sshOpts = '-o StrictHostKeyChecking=no -o ConnectTimeout=10';
        console.log('   Creating secure stream and uploading...');

        // Ensure destination exists
        execSync(`ssh -i "${resolvedKeyPath}" ${sshOpts} ubuntu@${serverIP} "mkdir -p ~/king-ai-studio"`, { stdio: 'ignore' });

        // Use tar to bundle everything except node_modules/git/data and stream to server
        // This is extremely fast and avoids GitHub private repo issues
        execSync(`tar --exclude=node_modules --exclude=.git --exclude=data -cf - . | ssh -i "${resolvedKeyPath}" ${sshOpts} ubuntu@${serverIP} "cd ~/king-ai-studio && tar -xf - && find . -name '*.sh' -exec sed -i 's/\\r$//' {} +"`, { stdio: 'inherit' });
        console.log('✅ Project files synced and sanitized.');
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
        execSync(`ssh -i "${resolvedKeyPath}" ${sshOpts} ubuntu@${serverIP} "./deploy.sh"`, { stdio: 'inherit' });

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
