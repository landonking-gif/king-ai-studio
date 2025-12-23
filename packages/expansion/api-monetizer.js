/**
 * APIMonetizer - Implements ROI Improvement #45
 * Identifies and packages internal capabilities as sellable APIs.
 */

export class APIMonetizer {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Analyze a module for API potential
     */
    async analyzeModule(moduleName, capabilities) {
        console.log(`[APIMonetizer] Analyzing ${moduleName} for API monetization potential`);

        const prompt = `Given this internal module "${moduleName}" with these capabilities: ${JSON.stringify(capabilities)},
        suggest how to package this as a paid public API.
        Include: Pricing tiers, Target developer persona, and Value prop.
        Output JSON with 'api_name', 'target_persona', 'pricing', 'value_prop'.`;

        const response = await this.modelRouter.complete(prompt);
        let plan;
        try {
            plan = JSON.parse(response.text);
        } catch (e) {
            plan = { api_name: `${moduleName} API`, value_prop: response.text };
        }

        return plan;
    }
}

export default APIMonetizer;
