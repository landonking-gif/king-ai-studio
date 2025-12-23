/**
 * Unity Launcher - Integrated Startup & Orchestration
 * Performs updates, migrations, pulls models, and launches the Empire Dashboard
 */

import { execSync, spawn } from 'child_process';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const PORT = 3847;

async function launch() {
    console.log('\n👑 KING AI STUDIO | UNITY LAUNCHER 🚀');
    console.log('═══════════════════════════════════════');

    try {
        // 1. Dependency Check
        console.log('📦 Checking dependencies...');
        execSync('npm install --no-fund --no-audit', { stdio: 'inherit', cwd: ROOT_DIR });

        // 2. Local AI Check (Ollama)
        console.log('🧠 Synchronizing AI models...');
        try {
            console.log('   - Pulling deepseek-r1:8b (Reasoning)');
            execSync('ollama pull deepseek-r1:8b', { stdio: 'inherit' });
            console.log('   - Pulling llama3.1:8b (General)');
            execSync('ollama pull llama3.1:8b', { stdio: 'inherit' });
        } catch (e) {
            console.warn('   ⚠️ Ollama not reachable or error pulling models. Continuing with Cloud-mode check.');
        }

        // 3. Database Migration
        console.log('🗄️ Synchronizing persistence layer...');
        if (!fs.existsSync(path.join(ROOT_DIR, 'data/king-ai.db'))) {
            console.log('   - Data path fresh or incomplete, running migration...');
            execSync('node scripts/migrate-to-sqlite.js', { stdio: 'inherit', cwd: ROOT_DIR });
        } else {
            console.log('   - SQLite database active and ready.');
        }

        // 4. Start the Empire
        console.log('⚖️ Launching Autonomous Empire...');
        const empire = spawn('node', ['index.js'], {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            detached: true
        });

        // 5. Open Dashboard
        console.log(`🌐 Opening Empire Dashboard at http://localhost:${PORT}...`);

        // Wait a few seconds for server to bind
        setTimeout(async () => {
            try {
                await open(`http://localhost:${PORT}`);
                console.log('\n✅ System Online! Dashboard should be open in your browser.');
                console.log('   Press Ctrl+C to shutdown the entire studio.\n');
            } catch (err) {
                console.error('   ❌ Could not open browser automatically:', err.message);
                console.log(`   👉 Please open manually: http://localhost:${PORT}`);
            }
        }, 3000);

        // Handle parent process termination
        process.on('SIGINT', () => {
            console.log('\n👋 Closing King AI Studio...');
            empire.kill();
            process.exit(0);
        });

    } catch (error) {
        console.error('\n❌ Launch Failed:', error.message);
        process.exit(1);
    }
}

launch();
