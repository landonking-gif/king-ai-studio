/**
 * Auto Refund - Automates refund handling
 * Processes refunds based on logic rules, minimizing human intervention
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutoRefund {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/support');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Process refund request
     */
    async processRequest(request) {
        // request: { orderId, amount, reason, customerDaysSincePurchase }

        let decision = 'review';
        let feedback = '';

        // Auto-approval Rules
        if (request.amount < 50 && request.customerDaysSincePurchase < 14) {
            decision = 'approve';
            feedback = 'Auto-approved: Low value, within guarantee window.';
        } else if (request.reason.includes('fraud')) {
            decision = 'escalate';
            feedback = 'Fraud alert trigger.';
        } else if (request.customerDaysSincePurchase > 30) {
            decision = 'reject';
            feedback = 'Outside 30-day policy.';
        }

        const result = {
            requestId: `ref-${Date.now()}`,
            orderId: request.orderId,
            decision,
            refundAmount: decision === 'approve' ? request.amount : 0,
            reason: request.reason,
            internalNote: feedback,
            processedAt: new Date().toISOString()
        };

        const file = path.join(this.dataDir, 'refunds.jsonl');
        fs.appendFileSync(file, JSON.stringify(result) + '\n');

        return result;
    }

    async execute(task) {
        if (task.action === 'process') return this.processRequest(task.data.request);
    }
}
export default AutoRefund;
