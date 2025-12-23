/**
 * ResourceArbiter - Implements ROI Improvement #56
 * Rebalances API credits, server budget, and compute power between ventures.
 */

export class ResourceArbiter {
    constructor(config = {}) {
        this.db = config.db;
    }

    /**
     * Rebalance resources based on ROI
     */
    async rebalanceResources() {
        console.log(`[ResourceArbiter] Auditing resource usage across empire...`);

        const businesses = await this.db.getAllBusinesses();

        // Calculate ROI for each
        const withRoi = businesses.map(b => ({
            ...b,
            roi: (b.revenue - b.expenses) / (b.expenses || 1)
        }));

        // Sort by ROI descending
        withRoi.sort((a, b) => b.roi - a.roi); // Higher ROI first

        const allocations = {};

        // High performers get 80% of resources
        withRoi.forEach((b, index) => {
            if (index < withRoi.length * 0.2) {
                allocations[b.id] = { tier: 'HIGH', api_limit: 'UNLIMITED', server_priority: 'HIGH' };
            } else if (index < withRoi.length * 0.5) {
                allocations[b.id] = { tier: 'MEDIUM', api_limit: 'STANDARD', server_priority: 'NORMAL' };
            } else {
                allocations[b.id] = { tier: 'LOW', api_limit: 'RESTRICTED', server_priority: 'LOW_COST' };
            }
        });

        console.log(`[ResourceArbiter] Rebalanced ${businesses.length} businesses.`);
        return allocations;
    }
}

export default ResourceArbiter;
