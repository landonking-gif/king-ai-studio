/**
 * Profit Tracker - Tracks revenue, expenses, and profitability per business
 * Enables auto-scaling decisions based on performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProfitTracker {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/profit');
        this.ensureDataDir();
        this.loadData();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadData() {
        const dataFile = path.join(this.dataDir, 'profit-data.json');
        if (fs.existsSync(dataFile)) {
            this.data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
        } else {
            this.data = {
                businesses: {},
                totalRevenue: 0,
                totalExpenses: 0,
                totalProfit: 0
            };
        }
    }

    saveData() {
        const dataFile = path.join(this.dataDir, 'profit-data.json');
        fs.writeFileSync(dataFile, JSON.stringify(this.data, null, 2));
    }

    /**
     * Register a new business for tracking
     */
    registerBusiness(businessId, name, metadata = {}) {
        if (!this.data.businesses[businessId]) {
            this.data.businesses[businessId] = {
                id: businessId,
                name,
                metadata,
                createdAt: new Date().toISOString(),
                revenue: [],
                expenses: [],
                totalRevenue: 0,
                totalExpenses: 0,
                profit: 0,
                roi: 0,
                status: 'active',
                metrics: {
                    customers: 0,
                    cac: 0, // Customer Acquisition Cost
                    ltv: 0, // Lifetime Value
                    conversionRate: 0,
                    churnRate: 0
                }
            };
            this.saveData();
        }
        return this.data.businesses[businessId];
    }

    /**
     * Record revenue
     */
    recordRevenue(businessId, amount, source, metadata = {}) {
        const business = this.data.businesses[businessId];
        if (!business) {
            throw new Error(`Business not found: ${businessId}`);
        }

        const entry = {
            id: `rev-${Date.now()}`,
            amount,
            source,
            metadata,
            timestamp: new Date().toISOString()
        };

        business.revenue.push(entry);
        business.totalRevenue += amount;
        business.profit = business.totalRevenue - business.totalExpenses;
        business.roi = business.totalExpenses > 0
            ? ((business.profit / business.totalExpenses) * 100).toFixed(2)
            : 0;

        this.data.totalRevenue += amount;
        this.data.totalProfit = this.data.totalRevenue - this.data.totalExpenses;

        this.saveData();
        console.log(`[ProfitTracker] Revenue +$${amount} for ${business.name}`);

        return entry;
    }

    /**
     * Record expense
     */
    recordExpense(businessId, amount, category, description = '') {
        const business = this.data.businesses[businessId];
        if (!business) {
            throw new Error(`Business not found: ${businessId}`);
        }

        const entry = {
            id: `exp-${Date.now()}`,
            amount,
            category,
            description,
            timestamp: new Date().toISOString()
        };

        business.expenses.push(entry);
        business.totalExpenses += amount;
        business.profit = business.totalRevenue - business.totalExpenses;
        business.roi = business.totalExpenses > 0
            ? ((business.profit / business.totalExpenses) * 100).toFixed(2)
            : 0;

        this.data.totalExpenses += amount;
        this.data.totalProfit = this.data.totalRevenue - this.data.totalExpenses;

        this.saveData();
        console.log(`[ProfitTracker] Expense -$${amount} (${category}) for ${business.name}`);

        return entry;
    }

    /**
     * Record new customer
     */
    recordCustomer(businessId, acquisitionCost = 0) {
        const business = this.data.businesses[businessId];
        if (!business) return;

        business.metrics.customers++;

        // Update CAC (rolling average)
        if (acquisitionCost > 0) {
            const prevTotal = business.metrics.cac * (business.metrics.customers - 1);
            business.metrics.cac = (prevTotal + acquisitionCost) / business.metrics.customers;
        }

        this.saveData();
    }

    /**
     * Get business performance
     */
    getBusinessPerformance(businessId) {
        const business = this.data.businesses[businessId];
        if (!business) return null;

        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        // Last 30 days revenue
        const recentRevenue = business.revenue
            .filter(r => new Date(r.timestamp) > thirtyDaysAgo)
            .reduce((sum, r) => sum + r.amount, 0);

        // Last 30 days expenses
        const recentExpenses = business.expenses
            .filter(e => new Date(e.timestamp) > thirtyDaysAgo)
            .reduce((sum, e) => sum + e.amount, 0);

        return {
            ...business,
            last30Days: {
                revenue: recentRevenue,
                expenses: recentExpenses,
                profit: recentRevenue - recentExpenses
            },
            isHealthy: business.profit > 0,
            isProfitable: business.roi > 0,
            recommendation: this.getRecommendation(business)
        };
    }

    /**
     * Get recommendation for a business
     */
    getRecommendation(business) {
        if (business.profit > 1000 && business.roi > 100) {
            return { action: 'scale', reason: 'High profit and ROI - invest more' };
        }
        if (business.profit > 0 && business.roi > 50) {
            return { action: 'maintain', reason: 'Profitable - continue current strategy' };
        }
        if (business.profit > 0) {
            return { action: 'optimize', reason: 'Marginally profitable - optimize for efficiency' };
        }
        if (business.totalExpenses > 500 && business.profit < 0) {
            return { action: 'kill', reason: 'Losing money with significant investment' };
        }
        return { action: 'evaluate', reason: 'Needs more data' };
    }

    /**
     * Get all profitable businesses sorted by ROI
     */
    getProfitableBusinesses() {
        return Object.values(this.data.businesses)
            .filter(b => b.profit > 0)
            .sort((a, b) => b.roi - a.roi);
    }

    /**
     * Get underperforming businesses
     */
    getUnderperformers() {
        return Object.values(this.data.businesses)
            .filter(b => b.profit < 0 && b.totalExpenses > 100)
            .sort((a, b) => a.profit - b.profit);
    }

    /**
     * Get empire summary
     */
    getSummary() {
        const businesses = Object.values(this.data.businesses);
        const profitable = businesses.filter(b => b.profit > 0);
        const unprofitable = businesses.filter(b => b.profit < 0);

        return {
            totalBusinesses: businesses.length,
            profitableCount: profitable.length,
            unprofitableCount: unprofitable.length,
            totalRevenue: this.data.totalRevenue,
            totalExpenses: this.data.totalExpenses,
            totalProfit: this.data.totalProfit,
            topPerformer: profitable.sort((a, b) => b.profit - a.profit)[0] || null,
            worstPerformer: unprofitable.sort((a, b) => a.profit - b.profit)[0] || null,
            avgROI: businesses.length > 0
                ? (businesses.reduce((sum, b) => sum + parseFloat(b.roi || 0), 0) / businesses.length).toFixed(2)
                : 0
        };
    }

    /**
     * Generate daily profit report
     */
    generateDailyReport() {
        const summary = this.getSummary();
        const profitable = this.getProfitableBusinesses();
        const underperformers = this.getUnderperformers();

        let report = `# 💰 Daily Profit Report\n\n`;
        report += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

        report += `## Empire Overview\n`;
        report += `- Total Revenue: **$${summary.totalRevenue.toFixed(2)}**\n`;
        report += `- Total Expenses: **$${summary.totalExpenses.toFixed(2)}**\n`;
        report += `- **Net Profit: $${summary.totalProfit.toFixed(2)}**\n`;
        report += `- Avg ROI: ${summary.avgROI}%\n\n`;

        report += `## Business Breakdown\n`;
        report += `- ✅ Profitable: ${summary.profitableCount}\n`;
        report += `- ❌ Unprofitable: ${summary.unprofitableCount}\n\n`;

        if (profitable.length > 0) {
            report += `## 🌟 Top Performers\n`;
            profitable.slice(0, 3).forEach((b, i) => {
                report += `${i + 1}. **${b.name}** - $${b.profit.toFixed(2)} profit (${b.roi}% ROI)\n`;
            });
            report += '\n';
        }

        if (underperformers.length > 0) {
            report += `## ⚠️ Need Attention\n`;
            underperformers.slice(0, 3).forEach((b, i) => {
                const rec = this.getRecommendation(b);
                report += `${i + 1}. **${b.name}** - $${b.profit.toFixed(2)} | Rec: ${rec.action}\n`;
            });
        }

        return report;
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'register':
                return this.registerBusiness(task.data.id, task.data.name, task.data.metadata);
            case 'revenue':
                return this.recordRevenue(task.data.businessId, task.data.amount, task.data.source, task.data.metadata);
            case 'expense':
                return this.recordExpense(task.data.businessId, task.data.amount, task.data.category, task.data.description);
            case 'customer':
                return this.recordCustomer(task.data.businessId, task.data.acquisitionCost);
            case 'performance':
                return this.getBusinessPerformance(task.data.businessId);
            case 'summary':
                return this.getSummary();
            case 'profitable':
                return this.getProfitableBusinesses();
            case 'underperformers':
                return this.getUnderperformers();
            case 'report':
                return this.generateDailyReport();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ProfitTracker;
