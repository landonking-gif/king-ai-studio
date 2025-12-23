/**
 * Tax Engine - Implements ROI Improvement #28
 * Calculates and segregates tax liabilities in real-time across the empire.
 */

export class TaxEngine {
    constructor(config = {}) {
        this.db = config.db;
        this.baseRate = config.baseTaxRate || 0.25; // 25% default
    }

    /**
     * Calculate tax liability for a revenue event
     */
    async calculateLiability(amount, businessId) {
        const business = await this.db.getBusiness(businessId);
        const rate = business?.taxRate || this.baseRate;
        const liability = amount * rate;

        console.log(`[TaxEngine] Provisioning $${liability.toFixed(2)} (${(rate * 100)}%) for business ${businessId}`);

        // Track in metadata
        if (business) {
            business.tax_provisioned = (business.tax_provisioned || 0) + liability;
            await this.db.saveBusiness(business);
        }

        return liability;
    }

    /**
     * Get system-wide tax report
     */
    async generateReport() {
        const businesses = await this.db.getAllBusinesses();
        const totalTax = businesses.reduce((sum, b) => sum + (b.tax_provisioned || 0), 0);
        return { total_tax_liability: totalTax, businessCount: businesses.length };
    }
}

export default TaxEngine;
