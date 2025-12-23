/**
 * SuccessStoryGen - Implements ROI Improvement #97
 * Turns raw customer reviews into polished Case Study PDFs.
 */

export class SuccessStoryGen {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Generate case study
     */
    async generateCaseStudy(customerName, resultsData) {
        console.log(`[SuccessStory] Drafting case study for ${customerName}...`);

        const prompt = `Write a compelling case study titled "How ${customerName} achieved ${resultsData.outcome}".
        Sections: The Challenge, The Solution, The Results.
        Tone: Professional and inspiring.`;

        const response = await this.modelRouter.complete(prompt);
        return {
            title: `Case Study: ${customerName}`,
            content: response.text,
            format: 'markdown'
        };
    }
}

export default SuccessStoryGen;
