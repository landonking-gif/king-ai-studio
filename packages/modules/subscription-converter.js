/**
 * Subscription Converter - Converts one-time buyers to subscribers
 * Identifies repurchase patterns and offers subscription incentives
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SubscriptionConverter {
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
     * Analyze customer for subscription potential
     */
    analyzeCustomer(customer, orderHistory) {
        // Check for repeat purchases of same item
        const productCounts = {};

        for (const order of orderHistory) {
            for (const item of order.items) {
                if (!item.isSubscription) {
                    productCounts[item.productId] = (productCounts[item.productId] || 0) + 1;
                }
            }
        }

        const potentialSubscriptions = [];

        for (const [productId, count] of Object.entries(productCounts)) {
            if (count >= 2) { // Bought at least twice
                potentialSubscriptions.push({
                    productId,
                    purchaseCount: count,
                    offer: {
                        discount: '15%',
                        benefits: ['Free shipping', 'Never run out']
                    }
                });
            }
        }

        return {
            customerId: customer.id,
            potentialSubscriptions,
            hasPotential: potentialSubscriptions.length > 0
        };
    }

    async execute(task) {
        if (task.action === 'analyze') return this.analyzeCustomer(task.data.customer, task.data.history);
    }
}
export default SubscriptionConverter;
