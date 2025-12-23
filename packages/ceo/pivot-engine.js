/**
 * PivotEngine - Implements ROI Improvement #35
 * Analyzes business performance and decides whether to continue, pivot, or shut down.
 */

export class PivotEngine {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.db = config.db;
    }

    /**
     * Evaluate a business performance
     */
    async evaluate(businessId) {
        const business = await this.db.getBusiness(businessId);
        if (!business) return { success: false, error: 'Business not found' };

        console.log(`[PivotEngine] Evaluating strategic future of: ${business.name}`);

        const prompt = `Analyze this business performance:
        Name: ${business.name}
        Revenue: $${business.revenue}
        Expenses: $${business.expenses}
        Status: ${business.status}
        
        Is this business viable? Should we:
        1. CONTINUE
        2. PIVOT (describe how)
        3. SHUT DOWN
        
        Return JSON with 'decision', 'reasoning', 'pivot_plan' (if any).`;

        const response = await this.modelRouter.complete(prompt);
        let result;
        try {
            result = JSON.parse(response.text);
        } catch (e) {
            result = { decision: 'CONTINUE', reasoning: 'Insufficient data for pivot analysis.' };
        }

        if (result.decision === 'SHUT DOWN') {
            business.status = 'SHUT_DOWN';
            await this.db.saveBusiness(business);
        }

        return result;
    }
}

export default PivotEngine;
