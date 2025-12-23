/**
 * ReferralEngine - Implements ROI Improvement #33
 * Automatically sets up and manages referral programs for businesses.
 */

export class ReferralEngine {
    constructor(config = {}) {
        this.db = config.db;
    }

    /**
     * Initialize a referral program for a business
     */
    async setupProgram(businessId, commissionRate = 0.2) {
        console.log(`[ReferralEngine] Setting up referral program for business ${businessId} at ${commissionRate * 100}%`);

        const business = await this.db.getBusiness(businessId);
        if (business) {
            business.referral_enabled = true;
            business.referral_rate = commissionRate;
            await this.db.saveBusiness(business);
        }

        return { success: true, programId: `ref-${businessId}` };
    }

    /**
     * Generate a referral link for a user
     */
    generateLink(businessId, userId) {
        return `https://refer.kingai.studio/${businessId}?ref=${userId}`;
    }
}

export default ReferralEngine;
