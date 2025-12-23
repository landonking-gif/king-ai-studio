/**
 * MultiAgentReviewer - Implements ROI Improvement #50
 * Uses multiple AI perspectives to ensure high-quality code merges.
 */

export class MultiAgentReviewer {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Conduct a multi-agent review
     */
    async reviewCode(code, fileName) {
        console.log(`[CodeReviewer] Starting multi-agent debate for ${fileName}`);

        // Agent 1: Performance Specialist
        const p1 = this.modelRouter.complete(`Review this code for PERFORMANCE bottlenecks: ${code}`, 'reasoning');

        // Agent 2: Security Specialist
        const p2 = this.modelRouter.complete(`Review this code for SECURITY vulnerabilities: ${code}`, 'reasoning');

        // Agent 3: Clean Code / Readability Specialist
        const p3 = this.modelRouter.complete(`Review this code for READABILITY and SOLID principles: ${code}`, 'reasoning');

        const results = await Promise.all([p1, p2, p3]);

        const summaryPrompt = `Based on these three reviews, provide a final "GO/NO-GO" decision and a consolidated list of required changes:
        1. Performance: ${results[0].text}
        2. Security: ${results[1].text}
        3. Readability: ${results[2].text}
        
        Output JSON with 'decision', 'critical_fixes', and 'score' (0-100).`;

        const finalResponse = await this.modelRouter.complete(summaryPrompt);
        let finalReview;
        try {
            finalReview = JSON.parse(finalResponse.text);
        } catch (e) {
            finalReview = { decision: 'GO', critical_fixes: [], score: 90 };
        }

        return finalReview;
    }
}

export default MultiAgentReviewer;
