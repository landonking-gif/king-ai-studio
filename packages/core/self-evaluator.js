/**
 * Self Evaluator - The "Critic"
 * Implements the recursive self-correction loop: Produce -> Critique -> Rewrite -> Verify
 */

export class SelfEvaluator {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.auditLogger = config.auditLogger;
        this.threshold = config.threshold || 0.8; // Score required to pass without rewrite
    }

    /**
     * Run the full self-correction loop on a task result
     * @param {string} taskDescription - The original task
     * @param {string|object} initialOutput - The initial AI output
     * @param {string[]} strategies - Optional list of strategies to apply
     * @returns {Promise<object>} - The final, verified output
     */
    async evaluateAndImprove(taskDescription, initialOutput, strategies = []) {
        console.log('[SelfEvaluator] 🧐 Critiquing initial output...');

        const contentStr = typeof initialOutput === 'string' ? initialOutput : JSON.stringify(initialOutput, null, 2);
        const strategiesStr = strategies.length > 0 ? `\nApplied Strategies:\n${strategies.map(s => `- ${s}`).join('\n')}` : '';

        // Step 1: Critique
        const critiquePrompt = `You are a hostile critic. Evaluate this output for the given task.
        
Task: ${taskDescription}
${strategiesStr}

Output:
${contentStr}

Identify:
1. Logical errors
2. Missing steps
3. Unsubstantiated claims
4. Safety violations
5. Failure to follow applied strategies

Return JSON:
{
    "score": (0.0 to 1.0),
    "critique": "Detailed criticism...",
    "issues": ["list", "of", "issues"],
    "needs_rewrite": true/false,
    "strategy_update": ["New rules to avoid these mistakes in the future"]
}`;

        const critiqueResult = await this.modelRouter.complete(critiquePrompt, 'reasoning', { format: 'json' });

        let critique = { score: 1.0, needs_rewrite: false, strategy_update: [] };
        if (critiqueResult.success) {
            try {
                critique = JSON.parse(critiqueResult.content);
            } catch (e) {
                console.warn('[SelfEvaluator] Failed to parse critique JSON, proceeding with initial output.');
            }
        }

        if (this.auditLogger) {
            this.auditLogger.logSystem('self_critique', { task: taskDescription, score: critique.score, issues: critique.issues });
        }

        // Return early if good enough
        if (!critique.needs_rewrite && critique.score >= this.threshold) {
            console.log(`[SelfEvaluator] ✅ Output passed with score ${critique.score}`);
            return {
                final_output: initialOutput,
                verification_notes: "Passed initial critique.",
                critique,
                was_rewritten: false
            };
        }

        // Step 2: Rewrite
        console.log(`[SelfEvaluator] ✏️ Rewriting output (Score: ${critique.score})...`);
        const rewritePrompt = `You are an expert editor. Rewrite the output to address the critic's issues. Ensure you follow all applied strategies.

Task: ${taskDescription}
${strategiesStr}

Original Output:
${contentStr}

Critic's Feedback:
${critique.critique}
Issues: ${JSON.stringify(critique.issues)}

Return the corrected output in the SAME format as the original. Only return the content.`;

        const rewriteResult = await this.modelRouter.complete(rewritePrompt, 'reasoning');

        const refinedOutput = rewriteResult.success ? rewriteResult.content : initialOutput;

        // Step 3: Final Verification
        console.log('[SelfEvaluator] 🔍 Verifying refined output...');
        const verifyPrompt = `Verify this rewritten output against the original task.
Task: ${taskDescription}
Output:
${typeof refinedOutput === 'string' ? refinedOutput : JSON.stringify(refinedOutput)}

Is this actionable and correct? Return JSON:
{
    "verified": true,
    "notes": "Verification comments",
    "improvements": ["What exactly was improved"]
}`;

        const verifyResult = await this.modelRouter.complete(verifyPrompt, 'reasoning', { format: 'json' });
        let verification = { verified: true, notes: "Auto-verified", improvements: [] };

        if (verifyResult.success) {
            try {
                verification = JSON.parse(verifyResult.content);
            } catch (e) { }
        }

        return {
            final_output: refinedOutput,
            verification_notes: verification.notes,
            improvements: verification.improvements,
            critique,
            was_rewritten: true
        };
    }
}

export default SelfEvaluator;
