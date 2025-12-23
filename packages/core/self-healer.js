/**
 * Self-Healer - Implements ROI Improvement #5 (Self-Healing Automation Nodes)
 * Detects failures in automation and uses AI to fix the logic on the fly.
 */

export class SelfHealer {
    constructor(config = {}) {
        this.ai = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Attempt to heal a failed task
     * @param {object} task - The failed task object
     * @param {string} error - The error message/stack trace
     * @param {object} context - Additional context (HTML snapshots, logs)
     */
    async heal(task, error, context = {}) {
        console.log(`[SelfHealer] Attempting to heal failed task: ${task.name}...`);

        const prompt = `You are an expert automation engineer. A task has failed and requires SELF-HEALING.
        
        TASK: ${task.name}
        DESCRIPTION: ${task.description}
        ERROR: ${error}
        CONTEXT: ${JSON.stringify(context.logs || '')}
        
        HTML SNIPPET (if applicable): ${context.html || 'N/A'}

        Analyze the failure. Is it due to a UI change, a rate limit, or a data error?
        Provide a JSON healing plan:
        {
            "diagnosis": "What went wrong",
            "healing_action": "The specific change needed to fix it (e.g. 'Use selector .submit-btn instead of #btn-1')",
            "confidence": 0-1.0,
            "retry_instructions": "Modified task instructions for the next attempt"
        }
        Return ONLY valid JSON.`;

        const result = await this.ai.complete(prompt, 'reasoning', { format: 'json' });

        if (result.success) {
            try {
                const plan = JSON.parse(result.content);

                if (this.auditLogger) {
                    this.auditLogger.logSystem('task_healed', {
                        taskId: task.id,
                        diagnosis: plan.diagnosis,
                        confidence: plan.confidence
                    });
                }

                return {
                    success: true,
                    plan,
                    shouldRetry: plan.confidence > 0.6
                };
            } catch (e) {
                return { success: false, error: 'Heal plan parse failed' };
            }
        }

        return { success: false, error: result.error };
    }
}

export default SelfHealer;
