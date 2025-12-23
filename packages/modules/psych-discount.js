/**
 * PsychDiscount - Implements ROI Improvement #64
 * Analyzes user scroll behavior to offer discounts only to 'undecided' users.
 */

export class PsychDiscount {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Determine if discount should be offered
     */
    shouldOfferDiscount(behaviorData) {
        // behaviorData mock: { scrollSpeed: 'slow', mouseJitter: true, timeOnPricing: 45 }

        let score = 0;
        if (behaviorData.scrollSpeed === 'slow') score += 20;
        if (behaviorData.mouseJitter) score += 30; // Sign of hesitation
        if (behaviorData.timeOnPricing > 30) score += 40; // Considering price

        const offer = score > 60;

        console.log(`[PsychDiscount] User hesitation score: ${score}/100. Offer discount? ${offer}`);

        return {
            offer_discount: offer,
            amount: offer ? '10%' : '0%',
            trigger_reason: offer ? 'Detected price hesitation' : 'User seems decided'
        };
    }
}

export default PsychDiscount;
