/**
 * RefundHandler - Implements ROI Improvement #32
 * Negotiates with customers requesting refunds to offer alternatives or minimize loss.
 */

export class RefundHandler {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Handle a refund request
     */
    async handleRequest(customerEmail, reason, amount) {
        console.log(`[RefundHandler] Processing refund request from ${customerEmail} for $${amount}`);

        const prompt = `A customer (${customerEmail}) is requesting a refund of $${amount} for reason: "${reason}". 
        Devise a negotiation strategy to offer them a credit or a partial refund instead to prevent a chargeback.
        Output JSON with 'strategy', 'offer_text', and 'discount_percentage'.`;

        const response = await this.modelRouter.complete(prompt);
        let strategy;
        try {
            strategy = JSON.parse(response.text);
        } catch (e) {
            strategy = { strategy: "Offer credit", offer_text: "We can offer you a 50% credit for your next purchase.", discount_percentage: 50 };
        }

        if (this.auditLogger) {
            this.auditLogger.logSystem('refund_negotiation', { customerEmail, amount, strategy });
        }

        return strategy;
    }
}

export default RefundHandler;
