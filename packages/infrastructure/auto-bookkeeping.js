/**
 * Auto Bookkeeping - Automated financial tracking
 * Records usage, revenue, and expenses for tax purposes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutoBookkeeping {
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
     * Record a transaction
     */
    async recordTransaction(transaction) {
        // transaction: { type: 'income'/'expense', amount: 100, category: 'Sales', description: '...' }

        const entry = {
            id: `tx-${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...transaction,
            taxDeductible: transaction.type === 'expense' && this.isDeductible(transaction.category)
        };

        const file = path.join(this.dataDir, 'ledger.jsonl');
        fs.appendFileSync(file, JSON.stringify(entry) + '\n');

        return entry;
    }

    isDeductible(category) {
        const deductibles = ['software', 'advertising', 'contractors', 'hosting', 'office_supplies', 'legal'];
        return deductibles.includes(category.toLowerCase());
    }

    /**
     * Generate Tax Estimate
     */
    async generateTaxEstimate(year = new Date().getFullYear()) {
        const file = path.join(this.dataDir, 'ledger.jsonl');
        if (!fs.existsSync(file)) return { estimatedTax: 0 };

        const transactions = fs.readFileSync(file, 'utf-8')
            .split('\n')
            .filter(l => l)
            .map(JSON.parse)
            .filter(t => t.timestamp.startsWith(year));

        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense' && t.taxDeductible).reduce((sum, t) => sum + t.amount, 0);

        const profit = income - expenses;
        const estimatedTax = Math.max(0, profit * 0.21); // Flat 21% corp tax rate assumption

        return {
            year,
            totalIncome: income,
            deductibleExpenses: expenses,
            netProfit: profit,
            estimatedTax,
            generatedAt: new Date().toISOString()
        };
    }

    async execute(task) {
        if (task.action === 'record') return this.recordTransaction(task.data.transaction);
        if (task.action === 'tax_report') return this.generateTaxEstimate(task.data.year);
    }
}
export default AutoBookkeeping;
