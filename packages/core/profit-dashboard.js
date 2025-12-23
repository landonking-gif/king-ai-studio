/**
 * ProfitDashboard - Implements ROI Improvement #84
 * Real-time aggregation of profit across all business units.
 */

export class ProfitDashboard {
    constructor(config = {}) {
        this.db = config.db;
    }

    /**
     * Get aggregate profit report
     */
    async getReport() {
        console.log(`[ProfitDashboard] Aggregating empire financials...`);

        const businesses = await this.db.getAllBusinesses();

        const totalRev = businesses.reduce((acc, b) => acc + (b.revenue || 0), 0);
        const totalExp = businesses.reduce((acc, b) => acc + (b.expenses || 0), 0);
        const netProfit = totalRev - totalExp;

        return {
            total_revenue: totalRev,
            total_expenses: totalExp,
            net_profit: netProfit,
            margin: totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) + '%' : '0%'
        };
    }
}

export default ProfitDashboard;
