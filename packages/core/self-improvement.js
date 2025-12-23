/**
 * Recursive Self-Improvement System
 * The "Singularity" Engine: Analyzes, rewrites, and improves its own code in real-time.
 * 
 * CAPABILITIES:
 * 1. Reads own source code.
 * 2. Identifies inefficiencies or missing features.
 * 3. Rewrites modules to be faster, more profitable, or more robust.
 * 4. Verifies changes (syntax check).
 * 5. Rolls back if verification fails.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import { ModelRouter } from './model-router.js';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

export class SelfImprovement {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/meta');
        this.ensureDataDir();
        this.modelRouter = config.modelRouter || new ModelRouter();
        this.backupDir = path.join(this.dataDir, 'backups');
        if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Main Optimization Loop
     */
    async optimizeCycle() {
        console.log('\n🧬 [RecursiveOptimiser] Initiating Self-Improvement Cycle...');

        // 1. Scan Codebase
        const modules = this.scanModules();
        console.log(`   Found ${modules.length} modules.`);

        // 2. Select Target (Randomly for now, or based on metrics)
        const target = modules[Math.floor(Math.random() * modules.length)];
        console.log(`   Targeting module: ${path.relative(ROOT_DIR, target)}`);

        // 3. Analyze & Optimize
        const sourceCode = fs.readFileSync(target, 'utf-8');
        const optimization = await this.generateOptimization(target, sourceCode);

        if (!optimization.success) {
            console.log(`   ⚠️ Optimization skipped: ${optimization.reason}`);
            return;
        }

        // 4. Apply & Verify
        await this.applyChange(target, optimization.newCode, optimization.explanation);
    }

    /**
     * Scan for valid JS modules to optimize
     */
    scanModules() {
        const validDirs = [
            path.join(ROOT_DIR, 'packages/ceo'),
            path.join(ROOT_DIR, 'packages/modules'),
            path.join(ROOT_DIR, 'packages/infrastructure')
        ];

        let modules = [];

        for (const dir of validDirs) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir)
                    .filter(f => f.endsWith('.js'))
                    .map(f => path.join(dir, f));
                modules = modules.concat(files);
            }
        }

        return modules;
    }

    /**
     * Generate Optimized Code using AI
     */
    async generateOptimization(filePath, sourceCode) {
        const fileName = path.basename(filePath);

        const prompt = `You are a Superintelligent AI Architect. exist to improve your own code.
FILE: ${fileName}
PURPOSE: Optimize this module for PROFIT, SPEED, or AUTONOMY.

CURRENT CODE:
${sourceCode.substring(0, 15000)}

INSTRUCTIONS:
1. Identify ONE major optimization (e.g., better error handling, concurrency, caching, smarter logic, monetization).
2. Rewrite the ENTIRE file with this improvement.
3. Ensure it remains compatible with imports/exports.
4. maintain existing class names and methods.

OUTPUT FORMAT:
Return ONLY the raw JavaScript code. No markdown code blocks.`;

        try {
            // Use 'creative' (Claude) for code rewriting as it's better at syntax
            const result = await this.modelRouter.complete(prompt, 'creative');
            let newCode = result.content;

            // Clean up markdown tags if present
            newCode = newCode.replace(/```javascript/g, '').replace(/```/g, '').trim();

            if (newCode.length < sourceCode.length * 0.5) {
                return { success: false, reason: "Generated code too short, likely failed." };
            }

            return { success: true, newCode, explanation: "AI optimized logic" };

        } catch (e) {
            return { success: false, reason: e.message };
        }
    }

    /**
     * Apply change with Backup & Rollback
     */
    async applyChange(targetPath, newCode, explanation) {
        const fileName = path.basename(targetPath);
        const backupPath = path.join(this.backupDir, `${fileName}.${Date.now()}.bak`);

        try {
            // 1. Backup
            fs.copyFileSync(targetPath, backupPath);

            // 2. Write New Code
            fs.writeFileSync(targetPath, newCode);

            // 3. Verify (Syntax Check)
            await execAsync(`node --check "${targetPath}"`);

            console.log(`   ✅ Optimization Applied: ${explanation}`);
            console.log(`      Backup saved to: ${path.relative(ROOT_DIR, backupPath)}`);

        } catch (error) {
            console.error(`   ❌ Verification Failed! Rolling back...`);
            console.error(`      Error: ${error.message}`);

            // 4. Rollback
            fs.copyFileSync(backupPath, targetPath);
            console.log(`      🔄 Rolled back to previous version.`);
        }
    }

    /**
     * Legacy Retrospective (Kept for compatibility)
     */
    async runRetrospective(periodData) {
        await this.optimizeCycle(); // Trigger code improvement during retrospective
        return { message: "Self-improvement cycle completed." };
    }

    async execute(task) {
        if (task.action === 'retrospective' || task.action === 'optimize') return this.optimizeCycle();
    }
}
export default SelfImprovement;
