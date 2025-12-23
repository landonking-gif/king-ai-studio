/**
 * Churn Reducer - Implements ROI Improvement #25
 * Dynamically intervenes when customers attempt to cancel to retain revenue.
 */

export class ChurnReducer {
    constructor(config = {}) {
        this.ai = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Handle a cancellation intent
     */
    async handleCancellationIntent(userId, businessId, reason) {
        console.log(`[ChurnReducer] Intervention triggered for user ${userId} (Business ${businessId})...`);

        const prompt = `A user is trying to cancel their subscription for reason: "${reason}".
        This user is high value to King AI Studio.
        
        Suggest a "Stay" offer. Options:
        1. 50% discount for 3 months.
        2. Free month upgrade.
        3. Switch to a lower-tier "Pause" plan.
        
        Return JSON:
        {
            "recommended_offer": "50% Discount",
            "message": "We hate to see you go. How about we cover half your next 3 months?",
            "internal_logic": "Why this offer works for this reason"
        }
        Return ONLY valid JSON.`;

        const result = await this.ai.complete(prompt, 'creative', { format: 'json' });

        if (result.success) {
            try { return JSON.parse(result.content); } catch (e) { return null; }
        }
        return null;
    }
}

export default ChurnReducer;
