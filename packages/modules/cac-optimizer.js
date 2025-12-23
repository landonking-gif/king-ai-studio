/**
 * CAC Optimizer - Optimizes Customer Acquisition Cost
 * Adjusts ad bids and targets based on conversion data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CACOptimizer {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/marketing');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Optimize ad campaign
     */
    optimizeCampaign(campaignId, metrics) {
        // metrics: { spend: 100, conversions: 5, cpa: 20, targetCpa: 15 }

        const currentCPA = metrics.spend / (metrics.conversions || 1);
        const targetCPA = metrics.targetCpa || 15;

        let action = 'maintain';
        let adjustment = 0;
        let reason = '';

        if (currentCPA > targetCPA * 1.5) {
            action = 'decrease_bid';
            adjustment = -0.20; // Decrease by 20%
            reason = `CPA ($${currentCPA.toFixed(2)}) is way above target ($${targetCPA})`;
        } else if (currentCPA > targetCPA) {
            action = 'decrease_bid';
            adjustment = -0.10; // Decrease by 10%
            reason = `CPA ($${currentCPA.toFixed(2)}) is slightly above target`;
        } else if (currentCPA < targetCPA * 0.7) {
            action = 'increase_bid';
            adjustment = 0.20; // Increase by 20% to scale
            reason = `CPA ($${currentCPA.toFixed(2)}) is excellent, valid to scale`;
        }

        const optimization = {
            campaignId,
            timestamp: new Date().toISOString(),
            currentCPA,
            targetCPA,
            action,
            adjustment,
            reason
        };

        const file = path.join(this.dataDir, 'optimizations.jsonl');
        fs.appendFileSync(file, JSON.stringify(optimization) + '\n');

        return optimization;
    }

    async execute(task) {
        if (task.action === 'optimize') return this.optimizeCampaign(task.data.campaignId, task.data.metrics);
    }
}
export default CACOptimizer;
