/**
 * Multi Currency - Handles Global Finance
 * Exchange rate tracking, automated hedging, multi-currency wallets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MultiCurrency {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/finance');
        this.ensureDataDir();
        // Base Rates (Simulated)
        this.rates = { USD: 1.0, EUR: 0.92, GBP: 0.78, JPY: 151.2 };
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Convert Amount
     */
    convert(amount, from, to) {
        const rateFrom = this.rates[from];
        const rateTo = this.rates[to];

        if (!rateFrom || !rateTo) throw new Error('Invalid currency code');

        const inUSD = amount / rateFrom;
        const result = inUSD * rateTo;

        return {
            amount,
            from,
            to,
            rate: rateTo / rateFrom,
            result: parseFloat(result.toFixed(2))
        };
    }

    /**
     * Hedging Recommendation
     */
    recommendHedge(exposure) {
        // exposure: { EUR: 50000, GBP: 10000 }
        // Simple logic: if exposure > 10k USD, hedge 50%

        const recommendations = [];

        for (const [currency, amount] of Object.entries(exposure)) {
            if (currency === 'USD') continue;

            const usdValue = this.convert(amount, currency, 'USD').result;
            if (usdValue > 10000) {
                recommendations.push({
                    pair: `${currency}/USD`,
                    action: 'sell_forward',
                    amount: amount * 0.5,
                    reason: `High exposure ($${usdValue.toFixed(0)}) > Threshold`
                });
            }
        }

        return recommendations;
    }

    async execute(task) {
        if (task.action === 'convert') return this.convert(task.data.amount, task.data.from, task.data.to);
        if (task.action === 'hedge') return this.recommendHedge(task.data.exposure);
    }
}
export default MultiCurrency;
