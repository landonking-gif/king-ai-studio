/**
 * Prompt Self-Optimizer - Implements ROI Improvement #7
 * Analyzes logs of successful/failed tasks and optimizes system prompts recursively.
 */

export class PromptSelfOptimizer {
    constructor(config = {}) {
        this.db = config.db;
        this.ai = config.modelRouter;
        this.auditLogger = config.auditLogger;
        this.promptsDir = config.promptsDir || './packages/core/prompts/versions';
        this.ensurePromptsDir();
    }

    ensurePromptsDir() {
        if (!fs.existsSync(this.promptsDir)) {
            fs.mkdirSync(this.promptsDir, { recursive: true });
        }
    }

    /**
     * Run an optimization cycle
     */
    async optimizePrompts() {
        console.log('[PromptSelfOptimizer] Starting recursive optimization cycle...');

        // 1. Fetch recent success/failure logs
        const logs = await this.db.db.all('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50');

        // 2. Analyze patterns
        const prompt = `You are a meta-prompting engineer. Analyze these execution logs:
        ${JSON.stringify(logs)}
        
        Identify common failure modes and successful patterns.
        Propose an updated "System Instruction" that would have prevented the failures.
        
        Return JSON:
        {
            "version": "1.1.x",
            "findings": "What you learned",
            "updated_instruction": "The full revised system prompt text",
            "impact_prediction": "Expected % improvement"
        }
        Return ONLY valid JSON.`;

        const result = await this.ai.complete(prompt, 'reasoning', { format: 'json' });

        if (result.success) {
            try {
                const update = JSON.parse(result.content);
                await this.savePromptVersion(update);

                // Live apply the new system prompt
                if (this.ai.setSystemPrompt) {
                    this.ai.setSystemPrompt(update.updated_instruction);
                }

                return { success: true, version: update.version };
            } catch (e) {
                return { success: false, error: 'Optimization parse failed' };
            }
        }

        return { success: false, error: result.error };
    }

    async savePromptVersion(update) {
        const file = path.join(this.promptsDir, `prompt-v${update.version}-${Date.now()}.json`);
        fs.writeFileSync(file, JSON.stringify(update, null, 2));
        console.log(`[PromptSelfOptimizer] Saved new prompt version: ${update.version}`);
    }
}

import fs from 'fs';
import path from 'path';

export default PromptSelfOptimizer;
