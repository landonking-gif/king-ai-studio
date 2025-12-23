/**
 * MultiCurrencyLedger - Implements ROI Improvement #31
 * Tracks income across multiple currencies (Fiat and Crypto).
 */

export class MultiCurrencyLedger {
    constructor(config = {}) {
        this.db = config.db;
        this.baseCurrency = config.baseCurrency || 'USD';
        this.rates = {
            'USD': 1,
            'BTC': 95000, // Hardcoded for demo, would fetch from API
            'ETH': 2500,
            'EUR': 1.08
        };
    }

    /**
     * Record a transaction in a specific currency
     */
    async recordTransaction(amount, currency, businessId, type = 'revenue') {
        const rate = this.rates[currency] || 1;
        const normalizedAmount = amount * rate;

        console.log(`[Ledger] Recorded ${amount} ${currency} (~$${normalizedAmount.toFixed(2)}) for business ${businessId}`);

        if (this.db) {
            // In a real app, this would go into a dedicated transactions table
            const business = await this.db.getBusiness(businessId);
            if (business) {
                if (type === 'revenue') {
                    business.revenue = (business.revenue || 0) + normalizedAmount;
                } else {
                    business.expenses = (business.expenses || 0) + normalizedAmount;
                }
                await this.db.saveBusiness(business);
            }
        }

        return normalizedAmount;
    }

    /**
     * Get total balance in base currency
     */
    async getTotalBalance() {
        const businesses = await this.db.getAllBusinesses();
        return businesses.reduce((sum, b) => sum + (b.revenue || 0) - (b.expenses || 0), 0);
    }
}

export default MultiCurrencyLedger;
