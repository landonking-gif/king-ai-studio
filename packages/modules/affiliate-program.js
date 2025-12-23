/**
 * Affiliate Program - Automates affiliate management
 * Generates links, tracks clicks/conversions, calculates commissions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AffiliateProgram {
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
     * Create affiliate link
     */
    createAffiliate(userId, name) {
        const code = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 8) + Math.floor(Math.random() * 100);
        const affiliate = {
            id: `aff-${Date.now()}`,
            userId,
            name,
            code,
            link: `?ref=${code}`,
            commissionRate: 0.20, // 20% default
            stats: { clicks: 0, conversions: 0, earnings: 0 },
            createdAt: new Date().toISOString()
        };

        const file = path.join(this.dataDir, 'affiliates.json');
        let affiliates = [];
        if (fs.existsSync(file)) affiliates = JSON.parse(fs.readFileSync(file));

        affiliates.push(affiliate);
        fs.writeFileSync(file, JSON.stringify(affiliates, null, 2));

        return affiliate;
    }

    /**
     * Track click
     */
    trackClick(code) {
        const file = path.join(this.dataDir, 'affiliates.json');
        if (!fs.existsSync(file)) return false;

        let affiliates = JSON.parse(fs.readFileSync(file));
        const affiliate = affiliates.find(a => a.code === code);

        if (affiliate) {
            affiliate.stats.clicks++;
            fs.writeFileSync(file, JSON.stringify(affiliates, null, 2));
            return true;
        }
        return false;
    }

    /**
     * Track conversion
     */
    trackConversion(code, amount) {
        const file = path.join(this.dataDir, 'affiliates.json');
        if (!fs.existsSync(file)) return null;

        let affiliates = JSON.parse(fs.readFileSync(file));
        const affiliate = affiliates.find(a => a.code === code);

        if (affiliate) {
            const commission = amount * affiliate.commissionRate;
            affiliate.stats.conversions++;
            affiliate.stats.earnings += commission;
            fs.writeFileSync(file, JSON.stringify(affiliates, null, 2));
            return { commission, affiliateId: affiliate.id };
        }
        return null;
    }

    async execute(task) {
        if (task.action === 'create') return this.createAffiliate(task.data.userId, task.data.name);
        if (task.action === 'click') return this.trackClick(task.data.code);
        if (task.action === 'convert') return this.trackConversion(task.data.code, task.data.amount);
    }
}
export default AffiliateProgram;
