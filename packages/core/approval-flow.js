/**
 * Approval Flow - Manages human-in-the-loop approvals
 * Queues approval requests, tracks responses, manages pending items
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PolicyEngine } from './policy-engine.js';
import { EmailNotifier } from './email-notifier.js';
import { AuditLogger } from './audit-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ApprovalFlow {
    constructor(config = {}) {
        this.policyEngine = config.policyEngine || new PolicyEngine();
        this.emailNotifier = config.emailNotifier || new EmailNotifier(config);
        this.auditLogger = config.auditLogger || new AuditLogger(config);
        this.db = config.db;
        this.pendingFile = config.pendingFile || path.join(__dirname, '../../data/pending-approvals.json');
        this.pending = []; // Now loaded from DB in submit/respond
    }

    /**
     * Load pending approvals from DB
     */
    async loadPending() {
        if (!this.db) return [];
        const rows = await this.db.getPendingApprovals();
        return rows.map(r => ({
            task: { id: r.task_id, title: r.title, description: r.description },
            status: r.status,
            submittedAt: r.created_at
        }));
    }

    /**
     * Save pending approvals to disk
     */
    savePending() {
        try {
            const dir = path.dirname(this.pendingFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.pendingFile, JSON.stringify(this.pending, null, 2));
        } catch (error) {
            console.error('Failed to save pending approvals:', error.message);
        }
    }

    /**
     * Submit a task for approval evaluation
     * @param {Object} task - The task to evaluate
     * @returns {Object} - { approved: boolean, pending: boolean, taskId: string }
     */
    async submit(task) {
        // Ensure task has an ID
        if (!task.id) {
            task.id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        }

        // Evaluate against policy
        const evaluation = this.policyEngine.evaluate(task);

        // Log the proposal
        this.auditLogger.logProposal(task, evaluation);

        if (!evaluation.requiresApproval) {
            // Auto-approve
            this.auditLogger.logApproval(task.id, true, 'system', 'Auto-approved by policy');
            return {
                approved: true,
                pending: false,
                taskId: task.id,
                reason: evaluation.reason
            };
        }

        // Requires human approval
        const pendingItem = {
            id: `approval-${Date.now()}`,
            task_id: task.id,
            type: task.type || 'general',
            title: task.title || task.name,
            description: task.description,
            amount: task.amount,
            impact: task.impact,
            recommendation: evaluation.reason,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        if (this.db) {
            await this.db.saveApproval(pendingItem);
        }

        // Send approval request email
        await this.emailNotifier.sendApprovalRequest(task, evaluation);

        return {
            approved: false,
            pending: true,
            taskId: task.id,
            reason: evaluation.reason
        };
    }

    /**
     * Handle an approval response
     */
    async respond(taskId, approved, notes = '') {
        if (this.db) {
            const approvals = await this.db.db.all('SELECT * FROM approvals WHERE task_id = ? AND status = "pending"', [taskId]);
            if (approvals.length === 0) return { success: false, error: 'Task not found in pending list' };

            const app = approvals[0];
            app.status = approved ? 'approved' : 'rejected';
            app.decided_at = new Date().toISOString();
            app.notes = notes;

            await this.db.saveApproval(app);

            // Log the approval decision
            this.auditLogger.logApproval(taskId, approved, 'user', notes);

            return {
                success: true,
                approved,
                taskId
            };
        }

        return { success: false, error: 'Database not initialized' };
    }

    /**
     * Get all pending approvals
     */
    getPending() {
        return this.pending.filter(p => p.status === 'pending');
    }

    /**
     * Check if a task is pending approval
     */
    isPending(taskId) {
        return this.pending.some(p => p.task.id === taskId && p.status === 'pending');
    }

    /**
     * Get approval status for a task
     */
    async getStatus(taskId) {
        if (!this.db) return { found: false };
        const row = await this.db.db.get('SELECT * FROM approvals WHERE task_id = ?', [taskId]);
        if (!row) return { found: false };
        return {
            found: true,
            status: row.status,
            submittedAt: row.created_at,
            respondedAt: row.decided_at
        };
    }
}

export default ApprovalFlow;
