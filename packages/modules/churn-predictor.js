/**
 * Churn Predictor - Analyzes user behavior to predict drop-off
 * Triggers retention workflows before users leave
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ChurnPredictor {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/analytics');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Calculate health score for a user
     */
    calculateHealthScore(userEvents) {
        // userEvents = [{ type: 'login', date: ... }, { type: 'usage', ... }]

        const now = new Date();
        const lastLogin = userEvents.find(e => e.type === 'login')?.date;
        const daysSinceLogin = lastLogin ? (now - new Date(lastLogin)) / (1000 * 60 * 60 * 24) : 30;

        let score = 100;

        // Recency penalty
        if (daysSinceLogin > 7) score -= 20;
        if (daysSinceLogin > 30) score -= 50;

        // Activity volume
        const activityCount = userEvents.length;
        if (activityCount < 5) score -= 10;

        // Negative signals
        const supportTickets = userEvents.filter(e => e.type === 'ticket').length;
        if (supportTickets > 2) score -= 15; // Frustrated?

        return Math.max(0, score);
    }

    /**
     * Get retention action based on score
     */
    getRetentionAction(score, user) {
        if (score > 80) return null; // Healthy

        if (score > 60) {
            return {
                action: 'email_checkin',
                subject: 'How are things going?',
                template: 'checkin_regular'
            };
        }

        if (score > 40) {
            return {
                action: 'offer_help',
                subject: 'Can we help you get more value?',
                template: 'offer_training'
            };
        }

        return {
            action: 'emergency_offer',
            subject: 'Special offer just for you',
            template: 'discount_50_percent'
        };
    }

    async analyzeUser(userId, events) {
        const score = this.calculateHealthScore(events);
        const action = this.getRetentionAction(score);

        console.log(`[ChurnPredictor] User ${userId} score: ${score}. Action: ${action?.action || 'None'}`);

        return { userId, score, action };
    }

    async execute(task) {
        if (task.action === 'analyze') return this.analyzeUser(task.data.userId, task.data.events);
    }
}
export default ChurnPredictor;
