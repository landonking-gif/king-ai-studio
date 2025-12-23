import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Strategy Manager - Manages the "Living Strategy"
 * Stores and updates execution rules based on performance
 */
export class StrategyManager {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data');
        this.strategyFile = path.join(this.dataDir, 'strategies.json');
        this.ensureDataDir();
        this.strategies = this.loadStrategies();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadStrategies() {
        if (fs.existsSync(this.strategyFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.strategyFile, 'utf8'));
            } catch (e) {
                console.error('[StrategyManager] Failed to load strategies:', e);
                return {};
            }
        }
        return {
            "general": [
                "Always verify external links before including them.",
                "Ensure JSON output is valid and follows requested schema.",
                "Prioritize safety and legal compliance in all business plans."
            ]
        };
    }

    saveStrategies() {
        try {
            fs.writeFileSync(this.strategyFile, JSON.stringify(this.strategies, null, 2));
        } catch (e) {
            console.error('[StrategyManager] Failed to save strategies:', e);
        }
    }

    /**
     * Get strategies applicable to a specific task type
     * @param {string} taskType 
     * @returns {string[]}
     */
    getApplicableStrategies(taskType) {
        const general = this.strategies.general || [];
        const specific = this.strategies[taskType] || [];
        return [...new Set([...general, ...specific])];
    }

    /**
     * Update strategies based on task results
     * @param {object} taskResult - { taskType, success, critique, improvements }
     */
    async updateStrategy(taskResult) {
        const { taskType, success, critique, improvements } = taskResult;
        console.log(`[StrategyManager] Updating strategies for ${taskType}...`);

        if (!this.strategies[taskType]) {
            this.strategies[taskType] = [];
        }

        if (improvements && Array.isArray(improvements)) {
            improvements.forEach(imp => {
                if (!this.strategies[taskType].includes(imp) && !this.strategies.general.includes(imp)) {
                    this.strategies[taskType].push(imp);
                }
            });
        }

        // Limit strategy growth - keep only top rules or most recent
        if (this.strategies[taskType].length > 10) {
            this.strategies[taskType] = this.strategies[taskType].slice(-10);
        }

        this.saveStrategies();
        return improvements || [];
    }
}

export default StrategyManager;
