/**
 * Finance Module - Financial tracking, budgets, and reporting
 * Currently uses mock data - ready to connect to QuickBooks/banks later
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FinanceModule {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../../data/finance');
        this.accountsFile = path.join(this.dataDir, 'accounts.json');
        this.transactionsFile = path.join(this.dataDir, 'transactions.json');
        this.budgetsFile = path.join(this.dataDir, 'budgets.json');

        // Integration status (for future connections)
        this.integrations = {
            quickbooks: { connected: false, lastSync: null },
            bank: { connected: false, lastSync: null },
            stripe: { connected: false, lastSync: null }
        };

        this.ensureDataDir();
        this.accounts = this.loadAccounts();
        this.transactions = this.loadTransactions();
        this.budgets = this.loadBudgets();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadAccounts() {
        try {
            if (fs.existsSync(this.accountsFile)) {
                return JSON.parse(fs.readFileSync(this.accountsFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load accounts:', error.message);
        }
        // Initialize with default chart of accounts
        return this.initializeDefaultAccounts();
    }

    loadTransactions() {
        try {
            if (fs.existsSync(this.transactionsFile)) {
                return JSON.parse(fs.readFileSync(this.transactionsFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load transactions:', error.message);
        }
        return [];
    }

    loadBudgets() {
        try {
            if (fs.existsSync(this.budgetsFile)) {
                return JSON.parse(fs.readFileSync(this.budgetsFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load budgets:', error.message);
        }
        return [];
    }

    saveAccounts() {
        fs.writeFileSync(this.accountsFile, JSON.stringify(this.accounts, null, 2));
    }

    saveTransactions() {
        fs.writeFileSync(this.transactionsFile, JSON.stringify(this.transactions, null, 2));
    }

    saveBudgets() {
        fs.writeFileSync(this.budgetsFile, JSON.stringify(this.budgets, null, 2));
    }

    /**
     * Initialize default chart of accounts
     */
    initializeDefaultAccounts() {
        const defaults = [
            // Assets
            { id: 'checking', name: 'Business Checking', type: 'asset', subtype: 'bank', balance: 0 },
            { id: 'savings', name: 'Business Savings', type: 'asset', subtype: 'bank', balance: 0 },
            { id: 'ar', name: 'Accounts Receivable', type: 'asset', subtype: 'receivable', balance: 0 },

            // Liabilities
            { id: 'ap', name: 'Accounts Payable', type: 'liability', subtype: 'payable', balance: 0 },
            { id: 'cc', name: 'Business Credit Card', type: 'liability', subtype: 'credit_card', balance: 0 },

            // Income
            { id: 'revenue', name: 'Service Revenue', type: 'income', subtype: 'revenue', balance: 0 },
            { id: 'other-income', name: 'Other Income', type: 'income', subtype: 'other', balance: 0 },

            // Expenses
            { id: 'payroll', name: 'Payroll Expense', type: 'expense', subtype: 'payroll', balance: 0 },
            { id: 'rent', name: 'Rent Expense', type: 'expense', subtype: 'occupancy', balance: 0 },
            { id: 'utilities', name: 'Utilities', type: 'expense', subtype: 'utilities', balance: 0 },
            { id: 'software', name: 'Software & Subscriptions', type: 'expense', subtype: 'technology', balance: 0 },
            { id: 'marketing', name: 'Marketing Expense', type: 'expense', subtype: 'marketing', balance: 0 },
            { id: 'supplies', name: 'Office Supplies', type: 'expense', subtype: 'supplies', balance: 0 },
            { id: 'professional', name: 'Professional Services', type: 'expense', subtype: 'professional', balance: 0 },
            { id: 'misc', name: 'Miscellaneous Expense', type: 'expense', subtype: 'other', balance: 0 }
        ];

        this.accounts = defaults;
        this.saveAccounts();
        return defaults;
    }

    /**
     * Record a transaction (manual entry)
     */
    recordTransaction(transaction) {
        const id = transaction.id || `txn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const newTransaction = {
            id,
            date: transaction.date || new Date().toISOString().split('T')[0],
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type || 'expense', // income, expense, transfer
            category: transaction.category,
            accountId: transaction.accountId,
            payee: transaction.payee || '',
            reference: transaction.reference || '',
            status: 'pending', // pending, cleared, reconciled
            source: 'manual', // manual, import, api
            createdAt: new Date().toISOString()
        };

        this.transactions.push(newTransaction);

        // Update account balance
        const account = this.accounts.find(a => a.id === transaction.accountId);
        if (account) {
            if (transaction.type === 'income') {
                account.balance += transaction.amount;
            } else if (transaction.type === 'expense') {
                account.balance -= transaction.amount;
            }
            this.saveAccounts();
        }

        this.saveTransactions();
        return newTransaction;
    }

    /**
     * Get transactions for a date range
     */
    getTransactions(startDate, endDate) {
        return this.transactions.filter(t => {
            const date = new Date(t.date);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    }

    /**
     * Create or update a budget
     */
    setBudget(budget) {
        const id = budget.id || `budget-${Date.now()}`;
        const existing = this.budgets.findIndex(b => b.id === id || b.category === budget.category);

        const newBudget = {
            id,
            category: budget.category,
            monthlyLimit: budget.monthlyLimit,
            period: budget.period || 'monthly',
            alertThreshold: budget.alertThreshold || 0.8, // Alert at 80%
            createdAt: new Date().toISOString()
        };

        if (existing >= 0) {
            this.budgets[existing] = { ...this.budgets[existing], ...newBudget };
        } else {
            this.budgets.push(newBudget);
        }

        this.saveBudgets();
        return newBudget;
    }

    /**
     * Check budget status
     */
    checkBudgets() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const monthTransactions = this.getTransactions(monthStart, monthEnd);

        return this.budgets.map(budget => {
            const spent = monthTransactions
                .filter(t => t.type === 'expense' && t.category === budget.category)
                .reduce((sum, t) => sum + t.amount, 0);

            const percentUsed = budget.monthlyLimit > 0 ? spent / budget.monthlyLimit : 0;

            return {
                category: budget.category,
                limit: budget.monthlyLimit,
                spent,
                remaining: budget.monthlyLimit - spent,
                percentUsed,
                overBudget: spent > budget.monthlyLimit,
                alert: percentUsed >= budget.alertThreshold
            };
        });
    }

    /**
     * Generate profit & loss report
     */
    getProfitLoss(startDate, endDate) {
        const transactions = this.getTransactions(startDate, endDate);

        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        // Group expenses by category
        const expensesByCategory = {};
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
            });

        return {
            period: { startDate, endDate },
            income,
            expenses,
            netIncome: income - expenses,
            profitMargin: income > 0 ? ((income - expenses) / income * 100).toFixed(1) + '%' : '0%',
            expenseBreakdown: expensesByCategory
        };
    }

    /**
     * Get balance sheet (simplified)
     */
    getBalanceSheet() {
        const assets = this.accounts.filter(a => a.type === 'asset');
        const liabilities = this.accounts.filter(a => a.type === 'liability');

        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);

        return {
            date: new Date().toISOString().split('T')[0],
            assets: assets.map(a => ({ name: a.name, balance: a.balance })),
            totalAssets,
            liabilities: liabilities.map(a => ({ name: a.name, balance: a.balance })),
            totalLiabilities,
            equity: totalAssets - totalLiabilities
        };
    }

    /**
     * Get cash flow summary
     */
    getCashFlow(days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const transactions = this.getTransactions(startDate, endDate);

        const inflows = transactions.filter(t => t.type === 'income');
        const outflows = transactions.filter(t => t.type === 'expense');

        return {
            period: `Last ${days} days`,
            totalInflows: inflows.reduce((sum, t) => sum + t.amount, 0),
            totalOutflows: outflows.reduce((sum, t) => sum + t.amount, 0),
            netCashFlow: inflows.reduce((sum, t) => sum + t.amount, 0) - outflows.reduce((sum, t) => sum + t.amount, 0),
            transactionCount: transactions.length
        };
    }

    /**
     * Get integration status
     */
    getIntegrationStatus() {
        return {
            ...this.integrations,
            message: 'No integrations connected yet. Set up QuickBooks or bank connection when ready.'
        };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'record':
                return this.recordTransaction(task.data);
            case 'transactions':
                return this.getTransactions(task.data.startDate, task.data.endDate);
            case 'set_budget':
                return this.setBudget(task.data);
            case 'check_budgets':
                return this.checkBudgets();
            case 'profit_loss':
                return this.getProfitLoss(task.data.startDate, task.data.endDate);
            case 'balance_sheet':
                return this.getBalanceSheet();
            case 'cash_flow':
                return this.getCashFlow(task.data?.days || 30);
            case 'accounts':
                return this.accounts;
            case 'status':
                return this.getIntegrationStatus();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default FinanceModule;
