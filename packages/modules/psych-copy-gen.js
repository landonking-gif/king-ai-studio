/**
 * PsychCopyGen - Implements ROI Improvement #94
 * Generates ad copy using specific psychological frameworks (PAS, AIDA).
 */

export class PsychCopyGen {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Generate copy
     */
    async generateCopy(product, framework = 'PAS') {
        const prompt = `Write ad copy for "${product}" using the ${framework} (Problem-Agitation-Solution) framework.
        Make it emotional and visceral.`;

        const response = await this.modelRouter.complete(prompt);
        return {
            framework,
            copy: response.text
        };
    }
}

export default PsychCopyGen;
