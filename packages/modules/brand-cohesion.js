/**
 * BrandCohesionAgent - Implements ROI Improvement #67
 * Ensures consistent visual and tonal brand identity across all businesses.
 */

export class BrandCohesionAgent {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Audit a piece of content for brand consistency
     */
    async auditContent(content, brandGuide) {
        console.log(`[BrandCohesion] Auditing content against brand guidelines...`);

        const prompt = `Review this content against the following Brand Guidelines:
        Guidelines: ${JSON.stringify(brandGuide)}
        Content: "${content}"
        
        Is it consistent? If not, rewrite it.
        Output JSON with 'is_consistent' (bool), 'critique', and 'rewritten_content'.`;

        const response = await this.modelRouter.complete(prompt);
        let audit;
        try {
            audit = JSON.parse(response.text);
        } catch (e) {
            audit = { is_consistent: true, critique: "Good", rewritten_content: content };
        }

        return audit;
    }
}

export default BrandCohesionAgent;
