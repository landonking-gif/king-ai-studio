/**
 * QuoteArchitect - Implements ROI Improvement #78
 * Automatically structures complex, high-ticket proposals.
 */

export class QuoteArchitect {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Generate a high-ticket proposal
     */
    async buildQuote(clientName, requirements, budget) {
        console.log(`[QuoteArchitect] Drafting proposal for ${clientName} ($${budget})...`);

        const prompt = `Draft a high-ticket enterprise proposal for ${clientName}.
        Requirements: ${requirements}
        Budget: $${budget}
        
        Structure:
        1. Executive Summary
        2. Scope of Work (broken down)
        3. Timeline
        4. "Why Us" (Value-add)
        
        Output JSON with 'proposal_text' and 'total_price'.`;

        const response = await this.modelRouter.complete(prompt);
        let quote;
        try {
            quote = JSON.parse(response.text);
        } catch (e) {
            quote = { proposal_text: "Standard Proposal...", total_price: budget };
        }

        return quote;
    }
}

export default QuoteArchitect;
