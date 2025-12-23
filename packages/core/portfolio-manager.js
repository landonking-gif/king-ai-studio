/**
 * Portfolio Manager - Implements ROI Improvement #1 (Autonomous Portfolio Rebalancing)
 * Automatically adjusts business priorities based on performance metrics.
 */

export class PortfolioManager {
    constructor(config = {}) {
        this.db = config.db;
        this.auditLogger = config.auditLogger;
        this.rebalanceThreshold = config.rebalanceThreshold || 0.1; // 10% change required to log
    }

    /**
     * Rebalance the entire portfolio based on profitability
     */
    async rebalance() {
        if (!this.db) return { success: false, error: 'Database not initialized' };

        console.log('[PortfolioManager] Starting autonomous rebalance...');
        const businesses = await this.db.getAllBusinesses();

        if (businesses.length === 0) return { success: true, message: 'No businesses to rebalance' };

        // Calculate performance scores
        const scoredBusinesses = businesses.map(b => {
            const revenue = b.revenue || 0;
            const expenses = b.expenses || 1; // Prevent div by zero
            const roi = revenue / expenses;
            return {
                ...b,
                currentRoi: roi
            };
        });

        // 1. Calculate Average ROI
        const totalRoi = scoredBusinesses.reduce((sum, b) => sum + b.currentRoi, 0);
        const avgRoi = totalRoi / scoredBusinesses.length;

        // 2. Adjust Priorities
        // High ROI (> avg) gets higher priority
        // Low ROI (< avg) gets lower priority
        const updates = [];
        for (const b of scoredBusinesses) {
            let newPriority = 1.0;

            if (b.currentRoi > avgRoi) {
                // High performer: Boost priority proportional to performance above average
                const boost = (b.currentRoi - avgRoi) / (avgRoi || 1);
                newPriority = Math.min(10.0, 1.0 + boost);
            } else if (b.currentRoi < avgRoi) {
                // Low performer: Diminish priority
                const penalty = (avgRoi - b.currentRoi) / (avgRoi || 1);
                newPriority = Math.max(0.1, 1.0 - penalty);
            }

            // Only update if significant change
            if (Math.abs(newPriority - (b.priority || 1.0)) > this.rebalanceThreshold) {
                updates.push({
                    id: b.id,
                    name: b.name,
                    oldPriority: b.priority,
                    newPriority: newPriority,
                    roi: b.currentRoi
                });

                await this.db.saveBusiness({ ...b, priority: newPriority });
            }
        }

        if (updates.length > 0) {
            console.log(`[PortfolioManager] Rebalanced ${updates.length} businesses.`);
            if (this.auditLogger) {
                this.auditLogger.logSystem('portfolio_rebalanced', {
                    updatedCount: updates.length,
                    avgRoi: avgRoi,
                    details: updates
                });
            }
        }

        return { success: true, rebalanced: updates.length, total: businesses.length };
    }

    /**
     * Record revenue for a business
     */
    async recordRevenue(businessId, amount) {
        const business = await this.db.getBusiness(businessId);
        if (!business) return { success: false, error: 'Business not found' };

        business.revenue = (business.revenue || 0) + amount;
        await this.db.saveBusiness(business);
        return { success: true, newRevenue: business.revenue };
    }

    /**
     * Record expenses for a business
     */
    async recordExpense(businessId, amount) {
        const business = await this.db.getBusiness(businessId);
        if (!business) return { success: false, error: 'Business not found' };

        business.expenses = (business.expenses || 0) + amount;
        await this.db.saveBusiness(business);
        return { success: true, newExpenses: business.expenses };
    }
}

export default PortfolioManager;
