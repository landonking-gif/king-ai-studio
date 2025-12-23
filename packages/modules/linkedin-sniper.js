/**
 * LinkedInSniper - Implements ROI Improvement #65
 * Targets C-suite executives with hyper-personalized "AI-audits".
 */

export class LinkedInSniper {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Generate outreach message for an executive
     */
    async generateOutreach(executiveProfile, companyUrl) {
        console.log(`[LinkedInSniper] Generating sniper outreach for ${executiveProfile.name} @ ${executiveProfile.company}`);

        const prompt = `Write a LinkedIn connection request + follow-up message for:
        Name: ${executiveProfile.name}
        Role: ${executiveProfile.role}
        Company: ${executiveProfile.company}
        
        Hook: Mention a specific likely pain point based on their company size/industry.
        Offer: A free "AI Audit" of their workflow.
        
        Output JSON with 'connection_note' (300 chars max) and 'follow_up_dm'.`;

        const response = await this.modelRouter.complete(prompt);
        let outreach;
        try {
            outreach = JSON.parse(response.text);
        } catch (e) {
            outreach = { connection_note: "Hi, let's connect.", follow_up_dm: "Need AI?" };
        }

        if (this.auditLogger) {
            this.auditLogger.logSystem('linkedin_sniper_gen', { executive: executiveProfile.name, outreach });
        }

        return outreach;
    }
}

export default LinkedInSniper;
