/**
 * SubjectLineOptimizer - Implements ROI Improvement #88
 * Uses psychographic triggers to craft high-open-rate subject lines.
 */

export class SubjectLineOptimizer {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Generate subject lines for a persona
     */
    async generateSubjects(topic, persona) {
        const prompt = `Write 3 email subject lines for "${topic}" targeting "${persona}".
        Use distinct psychographic triggers:
        1. Curiosity gap
        2. Pure benefit
        3. Urgency/Scarcity
        
        Output JSON with 'curiosity', 'benefit', 'urgency'.`;

        const response = await this.modelRouter.complete(prompt);
        let subjects;
        try {
            subjects = JSON.parse(response.text);
        } catch (e) {
            subjects = { curiosity: `Hidden truth about ${topic}`, benefit: `Gain more from ${topic}`, urgency: `${topic} ending soon` };
        }

        return subjects;
    }
}

export default SubjectLineOptimizer;
