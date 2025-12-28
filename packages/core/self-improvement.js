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
import { ErrorAnalyzer } from './error-analyzer.js';
import { LearningMemory } from './learning-memory.js';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

export class SelfImprovement {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/meta');
        this.ensureDataDir();

        this.modelRouter = config.modelRouter || new ModelRouter();
        this.errorAnalyzer = new ErrorAnalyzer(config);
        this.learningMemory = new LearningMemory(config);

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

        // 1. Analyze Errors to prioritize targets
        const errors = await this.errorAnalyzer.analyzeRecentErrors();
        let targetFile = null;
        let goal = 'OPTIMIZE';
        let context = '';

        if (errors.length > 0) {
            const topError = errors[0];
            console.log(`   ⚠️ Detected prioritized error: ${topError.signature} (Count: ${topError.count})`);
            const guessedFile = this.errorAnalyzer.guessSourceFile(topError.signature);
            if (guessedFile) {
                const absPath = path.join(ROOT_DIR, guessedFile);
                if (fs.existsSync(absPath)) {
                    targetFile = absPath;
                    goal = 'FIX_BUG';
                    context = `Fix this specific error: ${topError.signature}. Examples: ${JSON.stringify(topError.examples.map(e => e.message).slice(0, 2))}`;
                }
            }
        }

        // 2. Fallback to Exploration if no errors (or file not found)
        if (!targetFile) {
            const modules = this.scanModules();
            // Filter out unstable files
            const stableModules = modules.filter(m => !this.learningMemory.isUnstable(m));

            if (stableModules.length === 0) {
                console.log('   All modules are currently unstable. Skipping cycle to allow cool-down.');
                return;
            }

            targetFile = stableModules[Math.floor(Math.random() * stableModules.length)];
            goal = 'OPTIMIZE';
            context = 'Improve efficiency, error handling, or performance.';
        }

        console.log(`   Targeting module: ${path.relative(ROOT_DIR, targetFile)} [${goal}]`);

        // 3. Analyze & Optimize
        const sourceCode = fs.readFileSync(targetFile, 'utf-8');
        const optimization = await this.generateOptimization(targetFile, sourceCode, goal, context);

        if (!optimization.success) {
            console.log(`   ⚠️ Optimization skipped: ${optimization.reason}`);
            this.learningMemory.recordAttempt(targetFile, goal, false, optimization.reason);
            return;
        }

        // 4. Apply & Verify
        await this.applyChange(targetFile, optimization.newCode, optimization.explanation, goal);
    }

    /**
     * Scan for valid JS modules to optimize
     * Expanded to cover all main packages
     */
    scanModules() {
        const validDirs = [
            path.join(ROOT_DIR, 'packages/core'),
            path.join(ROOT_DIR, 'packages/ceo'),
            path.join(ROOT_DIR, 'packages/modules'),
            path.join(ROOT_DIR, 'packages/infrastructure') // Includes dashboard
        ];

        let modules = [];

        for (const dir of validDirs) {
            if (fs.existsSync(dir)) {
                // Recursive scan helper
                const scan = (d) => {
                    const files = fs.readdirSync(d);
                    for (const f of files) {
                        const fullPath = path.join(d, f);
                        const stat = fs.statSync(fullPath);
                        if (stat.isDirectory()) {
                            scan(fullPath);
                        } else if (f.endsWith('.js') && !f.includes('.test.') && !f.includes('node_modules')) {
                            modules.push(fullPath);
                        }
                    }
                };
                scan(dir);
            }
        }

        return modules;
    }

    /**
     * Generate Optimized Code using AI
     */
    async generateOptimization(filePath, sourceCode, goal, context) {
        const fileName = path.basename(filePath);
        const recentFailures = this.learningMemory.getRecentFailures(filePath);

        const prompt = `You are a Superintelligent AI Architect. exist to improve your own code.
FILE: ${fileName}
GOAL: ${goal}
CONTEXT: ${context}

AVOID PREVIOUS MISTAKES:
${recentFailures.length > 0 ? recentFailures.join('\n- ') : 'None'}

CURRENT CODE:
${sourceCode.substring(0, 20000)}

INSTRUCTIONS:
1. Implement the requested improvement or fix.
2. Rewrite the ENTIRE file.
3. preserve all exports and class structures.
4. Maintain compatibility with other modules.
5. If fixing a bug, add a comment explaining the fix.

OUTPUT FORMAT:
Return ONLY the raw JavaScript code. No markdown code blocks.`;

        try {
            // Use 'creative' (Claude/Gemini) for code rewriting as it's better at syntax
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
    async applyChange(targetPath, newCode, explanation, goal) {
        const fileName = path.basename(targetPath);
        const backupPath = path.join(this.backupDir, `${fileName}.${Date.now()}.bak`);

        try {
            // 1. Backup
            fs.copyFileSync(targetPath, backupPath);

            // 2. Write New Code
            fs.writeFileSync(targetPath, newCode);

            // 3. Verify (Syntax Check)
            await execAsync(`node --check "${targetPath}"`);

            // 3.5 Run Tests? (Future enhancement: run specific tests for this file)

            console.log(`   ✅ Optimization Applied: ${explanation}`);
            console.log(`      Backup saved to: ${path.relative(ROOT_DIR, backupPath)}`);

            this.learningMemory.recordAttempt(targetPath, goal, true, explanation);

        } catch (error) {
            console.error(`   ❌ Verification Failed! Rolling back...`);
            console.error(`      Error: ${error.message}`);

            // 4. Rollback
            fs.copyFileSync(backupPath, targetPath);
            console.log(`      🔄 Rolled back to previous version.`);

            this.learningMemory.recordAttempt(targetPath, goal, false, error.message);
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
        if (task.action === 'create_system') return this.createNewSystem(task.spec);
    }

    /**
     * Create a brand new system/module from scratch
     */
    async createNewSystem(spec) {
        console.log(`\n✨ [RecursiveArchitect] Creating new system: ${spec.name}`);
        const prompt = `You are a Superintelligent AI Architect.
GOAL: Create a new system module for King AI Studio.
NAME: ${spec.name}
DESCRIPTION: ${spec.description}
REQUIREMENTS: ${JSON.stringify(spec.requirements || [])}

INSTRUCTIONS:
1. Write the full JavaScript code for this module.
2. Include class definition, constructor, and methods.
3. Use imports from '../core/' as needed (ModelRouter, Database, etc.).
4. Return ONLY the raw JavaScript code.

OUTPUT FORMAT:
Return ONLY the raw code.`;

        try {
            const result = await this.modelRouter.complete(prompt, 'coding');
            let newCode = result.content.replace(/```javascript/g, '').replace(/```/g, '').trim();

            const fileName = spec.name.toLowerCase().replace(/ds+/g, '-') + '.js';
            const targetPath = path.join(ROOT_DIR, 'packages/modules', fileName);

            if (fs.existsSync(targetPath)) {
                console.log(`   ⚠️ Module already exists: ${fileName}. Aborting creation.`);
                return { success: false, error: 'Module exists' };
            }

            fs.writeFileSync(targetPath, newCode);
            await execAsync(`node --check "${targetPath}"`);

            console.log(`   ✅ New System Created: packages/modules/${fileName}`);
            this.learningMemory.recordAttempt(targetPath, 'CREATE', true, 'New system generated');

            return { success: true, path: targetPath };
        } catch (e) {
            console.error(`   ❌ Creation Failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    }
}
export default SelfImprovement;
