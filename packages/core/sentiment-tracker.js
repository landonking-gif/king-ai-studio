/**
 * SentimentTracker - Implements ROI Improvement #38
 * Monitors customer interactions and flags toxic users for removal.
 */

export class SentimentTracker {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Analyze interaction sentiment
     */
    async analyzeSentiment(text, customerId) {
        const prompt = `Analyze the sentiment and toxicity of this customer interaction:
        "${text}"
        
        Is this customer toxic (abusive, irrational, or net-negative for the business)?
        Rate toxicity from 0 to 1.
        Return JSON with 'score', 'is_toxic', and 'recommendation'.`;

        const response = await this.modelRouter.complete(prompt);
        let analysis;
        try {
            analysis = JSON.parse(response.text);
        } catch (e) {
            analysis = { score: 0.1, is_toxic: false, recommendation: 'None' };
        }

        if (analysis.is_toxic) {
            console.warn(`[SentimentTracker] FLAG: Toxic customer detected (${customerId}). Recommendation: ${analysis.recommendation}`);
            if (this.auditLogger) {
                this.auditLogger.logSystem('toxic_customer_flagged', { customerId, analysis });
            }
        }

        return analysis;
    }
}

export default SentimentTracker;
