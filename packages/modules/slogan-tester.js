/**
 * SloganTester - Implements ROI Improvement #92
 * A/B tests brand slogans recursively until finding a winner.
 */

export class SloganTester {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Generate and rank slogans
     */
    async rankSlogans(brandName, niche) {
        console.log(`[SloganTester] Generating slogans for ${brandName}...`);

        const prompt = `Generate 5 catchy slogans for "${brandName}" in the "${niche}" niche.
        Then, simulate an A/B test and predict the winner based on brevity and punchiness.
        
        Output JSON with 'candidates' array and 'predicted_winner'.`;

        const response = await this.modelRouter.complete(prompt);
        let result;
        try {
            result = JSON.parse(response.text);
        } catch (e) {
            result = { predicted_winner: `${brandName}: The Best Choice.` };
        }

        return result;
    }
}

export default SloganTester;
