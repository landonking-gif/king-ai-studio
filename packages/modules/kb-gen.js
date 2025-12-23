/**
 * KnowledgeBaseGen - Implements ROI Improvement #52
 * Automatically generates documentation based on user pain points.
 */

export class KnowledgeBaseGen {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Generate a help article from a ticket thread
     */
    async generateArticle(ticketThread, category) {
        console.log(`[KBGen] Converting ticket thread into help article...`);

        const prompt = `Convert this customer support interaction into a clear, concise "How-To" help article for our Knowledge Base.
        
        Ticket Thread:
        ${ticketThread}
        
        Format as Markdown with Title, Problem, Solution, and FAQ section.`;

        const response = await this.modelRouter.complete(prompt);

        return {
            title: `How to resolve ${category} issues`,
            content: response.text,
            category
        };
    }
}

export default KnowledgeBaseGen;
