/**
 * Auto Bank - Automates business banking
 * Integrates with Mercury/Brex APIs (simulated)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutoBank {
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
     * Open a bank account
     */
    async openAccount(entity) {
        console.log(`[AutoBank] Opening account for: ${entity.entityName}`);

        const account = {
            id: `bank-${Date.now()}`,
            entityId: entity.id,
            bankName: 'Mercury',
            accountNumber: Math.floor(Math.random() * 1000000000),
            routingNumber: '123456789',
            status: 'active',
            balance: 0,
            currency: 'USD',
            openedAt: new Date().toISOString()
        };

        const file = path.join(this.dataDir, 'bank-accounts.json');
        let accounts = [];
        if (fs.existsSync(file)) accounts = JSON.parse(fs.readFileSync(file));

        accounts.push(account);
        fs.writeFileSync(file, JSON.stringify(accounts, null, 2));

        return account;
    }

    async execute(task) {
        if (task.action === 'open') return this.openAccount(task.data.entity);
    }
}
export default AutoBank;
