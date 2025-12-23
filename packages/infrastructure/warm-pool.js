/**
 * Warm Account Pool - Manages pre-created social accounts
 * Keeps accounts active ('warmed up') to avoid immediate bans upon use
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WarmAccountPool {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/accounts');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Add new account to pool
     */
    addAccount(platform, credentials) {
        const account = {
            id: `acc-${Date.now()}`,
            platform,
            credentials, // encrypt in production
            status: 'warming', // warming, ready, in_use, banned
            ageDays: 0,
            activityLog: [],
            createdAt: new Date().toISOString()
        };

        const file = path.join(this.dataDir, 'warm-pool.json');
        let accounts = [];
        if (fs.existsSync(file)) accounts = JSON.parse(fs.readFileSync(file));

        accounts.push(account);
        fs.writeFileSync(file, JSON.stringify(accounts, null, 2));

        return account;
    }

    /**
     * Perform daily warming action (simulated)
     */
    async dailyWarmup() {
        const file = path.join(this.dataDir, 'warm-pool.json');
        if (!fs.existsSync(file)) return;

        let accounts = JSON.parse(fs.readFileSync(file));

        console.log(`[WarmPool] Warming up ${accounts.length} accounts...`);

        for (const acc of accounts) {
            if (acc.status === 'warming' || acc.status === 'ready') {
                // Simulate activity: scroll, like, generic post
                acc.activityLog.push({ date: new Date().toISOString(), action: 'browse_feed' });

                // Update age
                const age = (new Date() - new Date(acc.createdAt)) / (1000 * 60 * 60 * 24);
                acc.ageDays = Math.floor(age);

                if (acc.ageDays > 7 && acc.status === 'warming') {
                    acc.status = 'ready';
                }
            }
        }

        fs.writeFileSync(file, JSON.stringify(accounts, null, 2));
        return { success: true, accountsWarmed: accounts.length };
    }

    /**
     * Get a ready account
     */
    getAccount(platform) {
        const file = path.join(this.dataDir, 'warm-pool.json');
        if (!fs.existsSync(file)) return null;

        let accounts = JSON.parse(fs.readFileSync(file));
        const account = accounts.find(a => a.platform === platform && a.status === 'ready');

        if (account) {
            account.status = 'in_use';
            fs.writeFileSync(file, JSON.stringify(accounts, null, 2));
            return account;
        }
        return null;
    }

    async execute(task) {
        if (task.action === 'add') return this.addAccount(task.data.platform, task.data.credentials);
        if (task.action === 'warmup') return this.dailyWarmup();
        if (task.action === 'get') return this.getAccount(task.data.platform);
    }
}
export default WarmAccountPool;
