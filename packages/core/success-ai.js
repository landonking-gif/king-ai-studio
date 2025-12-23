/**
 * SuccessAI - Implements ROI Improvement #44
 * Proactively re-engages users to ensure long-term retention.
 */

export class SuccessAI {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.emailNotifier = config.emailNotifier;
    }

    /**
     * Check user health and reach out
     */
    async reengageUser(user) {
        if (user.daysSinceLastLogin > 7) {
            console.log(`[SuccessAI] User ${user.email} inactive for ${user.daysSinceLastLogin} days. Re-engaging...`);

            const prompt = `Draft a friendly re-engagement email for a user who hasn't logged in for ${user.daysSinceLastLogin} days.
            User Name: ${user.name}
            App Name: ${user.appName}
            Offer: Mention a new feature they might have missed.`;

            const response = await this.modelRouter.complete(prompt);

            if (this.emailNotifier) {
                await this.emailNotifier.sendNotification(`We miss you at ${user.appName}!`, response.text);
            }

            return { success: true, emailSent: true };
        }
        return { success: true, emailSent: false };
    }
}

export default SuccessAI;
