/**
 * Audit Logger - Immutable logging for all AI actions
 * Creates an append-only log of proposals, decisions, and deployments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AuditLogger {
    constructor(config = {}) {
        this.logDir = config.logDir || path.join(__dirname, '../../data/audit-logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Get today's log file path
     */
    getTodayLogPath() {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.logDir, `${date}.jsonl.gz`);
    }

    /**
     * Log an entry (append-only)
     * @param {Object} entry - The log entry
     */
    log(entry) {
        const enrichedEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        const logPath = this.getTodayLogPath();
        const compressed = zlib.gzipSync(JSON.stringify(enrichedEntry) + '\n');
        fs.appendFileSync(logPath + '.gz', compressed);

        return enrichedEntry;
    }

    /**
     * Log a task proposal
     */
    logProposal(task, evaluation) {
        return this.log({
            type: 'proposal',
            task: {
                id: task.id,
                name: task.name,
                category: task.category,
                description: task.description
            },
            evaluation: {
                requiresApproval: evaluation.requiresApproval,
                reason: evaluation.reason
            }
        });
    }

    /**
     * Log an approval decision
     */
    logApproval(taskId, approved, approver, notes = '') {
        return this.log({
            type: 'approval',
            taskId,
            approved,
            approver,
            notes
        });
    }

    /**
     * Log task execution
     */
    logExecution(taskId, status, result = {}) {
        return this.log({
            type: 'execution',
            taskId,
            status, // 'started', 'completed', 'failed', 'rolled_back'
            result
        });
    }

    /**
     * Log a system event
     */
    logSystem(event, details = {}) {
        return this.log({
            type: 'system',
            event,
            details
        });
    }

    /**
     * Get today's log entries
     */
    getTodayLogs() {
        const logPath = this.getTodayLogPath();
        if (!fs.existsSync(logPath)) {
            return [];
        }

        const compressed = fs.readFileSync(logPath);
        const content = zlib.gunzipSync(compressed).toString('utf-8');
        return content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
    }

    /**
     * Get summary for daily report
     */
    getDailySummary() {
        const logs = this.getTodayLogs();

        const summary = {
            date: new Date().toISOString().split('T')[0],
            totalActions: logs.length,
            proposals: logs.filter(l => l.type === 'proposal').length,
            approvals: logs.filter(l => l.type === 'approval').length,
            executions: logs.filter(l => l.type === 'execution').length,
            completed: logs.filter(l => l.type === 'execution' && l.status === 'completed').length,
            failed: logs.filter(l => l.type === 'execution' && l.status === 'failed').length,
            pendingApprovals: [],
            recentActions: []
        };

        // Get pending approvals (proposed but not approved/executed)
        const proposedIds = new Set(logs.filter(l => l.type === 'proposal').map(l => l.task?.id));
        const approvedIds = new Set(logs.filter(l => l.type === 'approval' && l.approved).map(l => l.taskId));

        for (const log of logs) {
            if (log.type === 'proposal' && !approvedIds.has(log.task?.id)) {
                summary.pendingApprovals.push(log.task);
            }
        }

        // Get last 10 actions
        summary.recentActions = logs.slice(-10).map(l => ({
            type: l.type,
            timestamp: l.timestamp,
            description: l.task?.name || l.event || l.taskId
        }));

        return summary;
    }
}

export default AuditLogger;
