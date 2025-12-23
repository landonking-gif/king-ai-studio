/**
 * Auto Scaler - Automatically scales successful businesses and kills failures
 * Implements reinvestment and resource allocation strategies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProfitTracker } from './profit-tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutoScaler {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/scaler');
        this.ensureDataDir();

        this.profitTracker = config.profitTracker || new ProfitTracker();

        // Scaling thresholds
        this.thresholds = config.thresholds || {
            scaleUpROI: 100,      // ROI % to trigger scale up
            scaleUpProfit: 500,   // Minimum profit to scale
            killLossThreshold: -200, // Loss amount to kill
            killDaysUnprofitable: 14, // Days unprofitable before kill
            reinvestmentPercent: 30 // % of profit to reinvest
        };

        // Scaling actions log
        this.actionsLog = [];
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Analyze all businesses and generate scaling decisions
     */
    analyze() {
        const summary = this.profitTracker.getSummary();
        const profitable = this.profitTracker.getProfitableBusinesses();
        const underperformers = this.profitTracker.getUnderperformers();

        const decisions = {
            scaleUp: [],
            maintain: [],
            optimize: [],
            kill: [],
            reinvestmentPool: 0
        };

        // Analyze profitable businesses
        for (const business of profitable) {
            const perf = this.profitTracker.getBusinessPerformance(business.id);

            if (business.roi >= this.thresholds.scaleUpROI &&
                business.profit >= this.thresholds.scaleUpProfit) {
                decisions.scaleUp.push({
                    businessId: business.id,
                    name: business.name,
                    currentProfit: business.profit,
                    roi: business.roi,
                    recommendedInvestment: business.profit * (this.thresholds.reinvestmentPercent / 100)
                });
                decisions.reinvestmentPool += business.profit * (this.thresholds.reinvestmentPercent / 100);
            } else {
                decisions.maintain.push({
                    businessId: business.id,
                    name: business.name,
                    profit: business.profit
                });
            }
        }

        // Analyze underperformers
        for (const business of underperformers) {
            if (business.profit <= this.thresholds.killLossThreshold) {
                decisions.kill.push({
                    businessId: business.id,
                    name: business.name,
                    loss: business.profit,
                    reason: 'Exceeded loss threshold'
                });
            } else {
                decisions.optimize.push({
                    businessId: business.id,
                    name: business.name,
                    loss: business.profit,
                    suggestion: 'Reduce spending, pivot strategy'
                });
            }
        }

        return decisions;
    }

    /**
     * Execute scaling decisions
     */
    async executeDecisions(decisions, ceoAgent = null) {
        const results = {
            scaled: [],
            killed: [],
            optimized: []
        };

        // Scale up winners
        for (const decision of decisions.scaleUp) {
            const action = {
                type: 'scale_up',
                businessId: decision.businessId,
                name: decision.name,
                investment: decision.recommendedInvestment,
                timestamp: new Date().toISOString(),
                actions: []
            };

            // Generate scaling actions
            action.actions = [
                { type: 'increase_ad_spend', amount: decision.recommendedInvestment * 0.4 },
                { type: 'increase_content_frequency', multiplier: 2 },
                { type: 'expand_channels', budget: decision.recommendedInvestment * 0.3 },
                { type: 'hire_more_agents', count: 2 }
            ];

            results.scaled.push(action);
            this.logAction(action);

            console.log(`[AutoScaler] Scaling ${decision.name}: +$${decision.recommendedInvestment.toFixed(2)} investment`);
        }

        // Kill losers
        for (const decision of decisions.kill) {
            const action = {
                type: 'kill',
                businessId: decision.businessId,
                name: decision.name,
                reason: decision.reason,
                finalLoss: decision.loss,
                timestamp: new Date().toISOString()
            };

            // Mark business as killed
            const business = this.profitTracker.data.businesses[decision.businessId];
            if (business) {
                business.status = 'killed';
                business.killedAt = new Date().toISOString();
                business.killReason = decision.reason;
                this.profitTracker.saveData();
            }

            results.killed.push(action);
            this.logAction(action);

            console.log(`[AutoScaler] Killed ${decision.name}: Lost $${Math.abs(decision.loss).toFixed(2)}`);
        }

        // Generate optimization suggestions
        for (const decision of decisions.optimize) {
            results.optimized.push({
                businessId: decision.businessId,
                name: decision.name,
                suggestions: [
                    'Reduce advertising spend by 50%',
                    'Focus on organic content only',
                    'Pivot to higher-margin offerings',
                    'Review pricing strategy'
                ]
            });
        }

        return results;
    }

    /**
     * Log scaling action
     */
    logAction(action) {
        this.actionsLog.push(action);

        const logFile = path.join(this.dataDir, 'scaling-log.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(action) + '\n');
    }

    /**
     * Get scaling history
     */
    getHistory() {
        const logFile = path.join(this.dataDir, 'scaling-log.jsonl');
        if (!fs.existsSync(logFile)) return [];

        return fs.readFileSync(logFile, 'utf-8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
    }

    /**
     * Calculate optimal resource allocation
     */
    calculateAllocation(totalBudget) {
        const profitable = this.profitTracker.getProfitableBusinesses();

        if (profitable.length === 0) {
            return {
                newBusinesses: totalBudget * 0.7,
                experimentation: totalBudget * 0.3
            };
        }

        // Allocate based on ROI
        const totalROI = profitable.reduce((sum, b) => sum + parseFloat(b.roi || 0), 0);

        const allocation = {
            reinvestment: {},
            newBusinesses: totalBudget * 0.2,
            emergency: totalBudget * 0.1
        };

        const reinvestBudget = totalBudget * 0.7;

        for (const business of profitable) {
            const share = parseFloat(business.roi || 0) / totalROI;
            allocation.reinvestment[business.id] = {
                name: business.name,
                amount: reinvestBudget * share,
                reason: `${((share * 100).toFixed(1))}% of reinvestment due to ${business.roi}% ROI`
            };
        }

        return allocation;
    }

    /**
     * Run auto-scaling cycle
     */
    async runCycle() {
        console.log('[AutoScaler] Running analysis cycle...');

        const decisions = this.analyze();
        const results = await this.executeDecisions(decisions);

        const summary = {
            timestamp: new Date().toISOString(),
            decisions,
            results,
            nextCycle: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        // Save cycle summary
        const summaryFile = path.join(this.dataDir, `cycle-${Date.now()}.json`);
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

        return summary;
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'analyze':
                return this.analyze();
            case 'execute':
                const decisions = this.analyze();
                return this.executeDecisions(decisions);
            case 'cycle':
                return this.runCycle();
            case 'allocate':
                return this.calculateAllocation(task.data.budget);
            case 'history':
                return this.getHistory();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default AutoScaler;
