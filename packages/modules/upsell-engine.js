/**
 * UpsellEngine - Implements ROI Improvement #46
 * Detects intent for advanced features and offers timely upgrades.
 */

export class UpsellEngine {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Analyze user interaction for upsell opportunity
     */
    async detectOpportunity(message, userProfile) {
        console.log(`[UpsellEngine] Analyzing message for upsell signals: "${message.substring(0, 50)}..."`);

        const prompt = `Analyze this user message for "buy signals" or frustration that could be solved by a higher-tier plan.
        Message: "${message}"
        User Tier: ${userProfile.tier}
        Available Upgrades: Pro ($49/mo), Enterprise ($499/mo)
        
        Output JSON with 'opportunity_found' (boolean), 'recommended_plan', and 'pitch_text'.`;

        const response = await this.modelRouter.complete(prompt);
        let result;
        try {
            result = JSON.parse(response.text);
        } catch (e) {
            result = { opportunity_found: false };
        }

        return result;
    }
}

export default UpsellEngine;
