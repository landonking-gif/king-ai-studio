/**
 * Margin Analyzer - Analyzes and optimizes business margins
 * Identifies low-margin products and cost inefficiencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MarginAnalyzer {
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
     * Analyze margins for products
     */
    analyzeMargins(products, expenses) {
        const analysis = products.map(product => {
            const cog = expenses.find(e => e.productId === product.id)?.amount || 0;
            const price = product.price;
            const margin = price - cog;
            const marginPercent = price > 0 ? (margin / price) * 100 : 0;

            const status = marginPercent < 20 ? 'critical' : (marginPercent < 40 ? 'warning' : 'healthy');
            const recommendation = status === 'critical' ? 'Increase price or cut costs' : (status === 'warning' ? 'Monitor closely' : 'Good performance');

            return {
                productId: product.id,
                name: product.name,
                price,
                cost: cog,
                margin,
                marginPercent: marginPercent.toFixed(2) + '%',
                status,
                recommendation
            };
        });

        const lowMarginCount = analysis.filter(p => p.status === 'critical').length;

        const report = {
            timestamp: new Date().toISOString(),
            totalProducts: products.length,
            lowMarginProducts: lowMarginCount,
            details: analysis
        };

        const file = path.join(this.dataDir, 'margin-analysis.json');
        fs.writeFileSync(file, JSON.stringify(report, null, 2));

        return report;
    }

    async execute(task) {
        if (task.action === 'analyze') return this.analyzeMargins(task.data.products, task.data.expenses);
    }
}
export default MarginAnalyzer;
