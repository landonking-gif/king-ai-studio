/**
 * Meta Learner - Extracts general principles from execution
 * Dynamically updates the system prompt in ModelRouter
 */
export class MetaLearner {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Extract general principles from a task execution
     * @param {object} taskResult - { taskDescription, finalOutput, critique, wasRewritten }
     */
    async extractPrinciples(taskResult) {
        if (!taskResult.critique || !taskResult.wasRewritten) return null;

        console.log('[MetaLearner] Extracting general principles...');

        const prompt = `Based on this task execution and self-critique, extract 1-2 general principles that should be applied to ALL future tasks to improve performance.

Task: ${taskResult.taskDescription}
Issues Found: ${JSON.stringify(taskResult.critique.issues)}
Final Corrected Output: ${typeof taskResult.finalOutput === 'string' ? taskResult.finalOutput : JSON.stringify(taskResult.finalOutput)}

Principles should be high-level, e.g., "Always double-check API documentation for specific parameter requirements" or "Ensure all marketing plans include a ROI estimation section".

Return JSON:
{
    "principles": ["Principle 1", "Principle 2"],
    "reasoning": "Why these principles are important"
}`;

        const result = await this.modelRouter.complete(prompt, 'reasoning', { format: 'json' });

        if (result.success) {
            try {
                const data = JSON.parse(result.content);
                if (data.principles && data.principles.length > 0) {
                    await this.updateSystemPrompt(data.principles);
                    return data.principles;
                }
            } catch (e) {
                console.error('[MetaLearner] Failed to parse principles JSON:', e);
            }
        }
        return null;
    }

    /**
     * Update the system prompt in ModelRouter
     * @param {string[]} newPrinciples 
     */
    async updateSystemPrompt(newPrinciples) {
        const currentPrompt = this.modelRouter.systemPrompt || "You are King AI, an autonomous business agent.";

        console.log('[MetaLearner] Optimizing System Prompt...');

        const optimizationPrompt = `As the Overmind of King AI, integrate these new learned principles into the core system prompt to improve future performance. Optimize for clarity and impact.

New Principles:
${newPrinciples.map(p => `- ${p}`).join('\n')}

Current System Prompt:
${currentPrompt}

Return the NEW system prompt in its entirety.`;

        const result = await this.modelRouter.complete(optimizationPrompt, 'reasoning');

        if (result.success) {
            this.modelRouter.setSystemPrompt(result.content);
            if (this.auditLogger) {
                this.auditLogger.logSystem('system_prompt_update', { principles: newPrinciples, newPromptLength: result.content.length });
            }
        }
    }
}

export default MetaLearner;
