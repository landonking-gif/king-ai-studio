/**
 * Bundle Optimizer - Creates high-margin product bundles
 * Identifies products that sell well together to increase AOV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BundleOptimizer {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/sales');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Generate bundle recommendations
     */
    generateBundles(products, salesHistory) {
        // salesHistory: [{ items: ['id1', 'id2'], total: 100 }, ...]

        // 1. Calculate Pair Frequencies
        const pairs = {};
        salesHistory.forEach(order => {
            const items = order.items;
            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const key = [items[i], items[j]].sort().join('|');
                    pairs[key] = (pairs[key] || 0) + 1;
                }
            }
        });

        // 2. Identify top pairs
        const topPairs = Object.entries(pairs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // 3. Create Bundle Offers
        const bundles = topPairs.map(([key, count]) => {
            const [id1, id2] = key.split('|');
            const p1 = products.find(p => p.id === id1);
            const p2 = products.find(p => p.id === id2);

            if (!p1 || !p2) return null;

            const separatePrice = p1.price + p2.price;
            const bundlePrice = Math.floor(separatePrice * 0.85); // 15% discount

            return {
                id: `bnd-${id1}-${id2}`,
                name: `${p1.name} + ${p2.name} Bundle`,
                items: [p1, p2],
                separatePrice,
                bundlePrice,
                discount: '15%',
                reason: `Bought together ${count} times`
            };
        }).filter(Boolean);

        return bundles;
    }

    async execute(task) {
        if (task.action === 'generate') return this.generateBundles(task.data.products, task.data.salesHistory);
    }
}
export default BundleOptimizer;
