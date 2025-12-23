/**
 * SubscriptionOptimizer - Implements ROI Improvement #47
 * Optimizes subscription cycles for cashflow and retention.
 */

export class SubscriptionOptimizer {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.emailNotifier = config.emailNotifier;
    }

    /**
     * Check if user should be moved to annual
     */
    async recommendAnnualPlan(user) {
        if (user.monthsActive > 3 && user.usageLevel === 'high' && user.billingCycle === 'monthly') {
            const savings = user.monthlyRate * 12 * 0.2; // 20% discount
            console.log(`[SubOptimizer] Recommending annual plan to ${user.email}. Potential savings: $${savings}`);

            const prompt = `Draft a compelling offer to switch from monthly to annual billing for user ${user.name}.
            Current: $${user.monthlyRate}/mo
            New: $${(user.monthlyRate * 0.8).toFixed(2)}/mo (billed annually)
            Total Year 1 Savings: $${savings.toFixed(2)}`;

            const response = await this.modelRouter.complete(prompt);

            if (this.emailNotifier) {
                await this.emailNotifier.sendNotification('Save 20% on your subscription!', response.text);
            }

            return { success: true, offerSent: true };
        }
        return { success: true, offerSent: false };
    }
}

export default SubscriptionOptimizer;
