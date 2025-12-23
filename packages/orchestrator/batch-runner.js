/**
 * Batch Runner - Executes the Top 100 Business List
 * Runs sequentially to avoid resource contention
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { fileURLToPath } from 'url';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

async function main() {
    const listPath = path.join(ROOT_DIR, 'target_100_list.json');
    if (!fs.existsSync(listPath)) {
        console.error('Target list not found!');
        process.exit(1);
    }

    const businesses = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
    console.log(`Loaded ${businesses.length} businesses to simulate.`);

    const logDir = path.join(ROOT_DIR, 'data/logs/simulations');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    for (let i = 0; i < businesses.length; i++) {
        const idea = businesses[i];
        const logFile = path.join(logDir, `biz_${i + 1}.log`);

        // Skip if already completed
        if (fs.existsSync(logFile)) {
            console.log(`[${i + 1}/${businesses.length}] Skipping (already done): ${idea.substring(0, 50)}...`);
            continue;
        }

        console.log(`\n\n[${i + 1}/${businesses.length}] >>> STARTING SIMULATION: ${idea.substring(0, 100)}...`);
        const startTime = Date.now();

        try {
            // Run empire.js for this business
            const { stdout, stderr } = await execAsync(`node empire.js "${idea}"`, {
                cwd: ROOT_DIR,
                timeout: 300000 // 5 minutes per business max
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ [${i + 1}/${businesses.length}] COMPLETED in ${duration}s`);

            // Log output to file
            fs.writeFileSync(logFile, stdout + '\nERROR_LOG:\n' + stderr);

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.error(`❌ [${i + 1}/${businesses.length}] FAILED after ${duration}s:`, error.message);
            // Even on failure, we record the log if we have partial output
            if (error.stdout || error.stderr) {
                fs.writeFileSync(logFile, (error.stdout || '') + '\nERROR_LOG:\n' + (error.stderr || ''));
            }
        }

        // Cool down
        await new Promise(r => setTimeout(r, 1000));
    }
}

main().catch(console.error);
