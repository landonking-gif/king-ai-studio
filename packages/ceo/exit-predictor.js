/**
 * Exit Predictor - Calculates business valuation and exit timing
 * Advises when to sell a business for maximum profit
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExitPredictor {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/finance');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Calculate Valuation
     */
    calculateValuation(business) {
        const mrr = business.mrr || 0;
        const growthRate = business.growthRate || 0; // percentage
        const churn = business.churn || 5; // percentage

        // Simple SaaS Multiple Logic
        let multiple = 4.0; // Base 4x ARR

        if (growthRate > 20) multiple += 2.0;
        if (growthRate > 50) multiple += 3.0; // High growth premium
        if (churn < 3) multiple += 1.5;
        if (churn > 10) multiple -= 2.0;

        const date = new Date();
        const arr = mrr * 12;
        const valuation = arr * multiple;

        return {
            date: date.toISOString(),
            businessName: business.name,
            metrics: { mrr, arr, growthRate, churn },
            multiple,
            estimatedValuation: valuation,
            marketStatus: 'neutral' // Could come from MarketTiming
        };
    }

    /**
     * Should we sell?
     */
    recommendExit(valuation, marketTiming) {
        // marketTiming: { entryScore: 50, trend: 'peaking' }

        const recommendations = [];

        if (marketTiming.trend === 'peaking') {
            recommendations.push("Market is peaking. Consider selling within 3 months.");
        }

        if (valuation.metrics.growthRate < 5 && valuation.metrics.profit > 0) {
            recommendations.push("Growth stalled. Cash cow or sell now.");
        }

        if (valuation.metrics.churn > 15) {
            recommendations.push("High churn danger. Fix or liquidate.");
        }

        return {
            action: recommendations.length > 0 ? 'consider_exit' : 'hold',
            confidence: 0.8,
            details: recommendations
        };
    }

    async execute(task) {
        if (task.action === 'value') return this.calculateValuation(task.data.business);
        if (task.action === 'recommend') return this.recommendExit(task.data.valuation, task.data.marketTiming);
    }
}
export default ExitPredictor;
