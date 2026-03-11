/**
 * Error Analyzer
 * Scans audit logs to identify pattern failures and suggest high-priority fixes
 * for the Self-Improvement engine.
 */
import path from 'path';
import fs from 'fs';
import { AuditLogger } from './audit-logger.js';

export class ErrorAnalyzer {
    constructor(config = {}) {
        this.auditLogger = config.auditLogger || new AuditLogger();
    }

    /**
     * Analyze recent logs for errors
     * @param {number} days - Number of days to look back (default 1)
     */
    async analyzeRecentErrors(days = 1) {
        const errors = [];

        // precise implementation would fetch multiple days
        // for now, we focus on strictly "today" which is fast
        const logs = this.auditLogger.getTodayLogs();

        for (const log of logs) {
            if (log.type === 'execution' && log.status === 'failed') {
                errors.push({
                    type: 'task_failure',
                    message: log.result?.error || 'Unknown task failure',
                    context: log.task,
                    timestamp: log.timestamp
                });
            } else if (log.type === 'system' && log.event === 'error') {
                errors.push({
                    type: 'system_error',
                    message: log.details?.error || log.details?.message || 'Unknown system error',
                    context: log.details,
                    timestamp: log.timestamp
                });
            } else if (log.level === 'error') {
                errors.push({
                    type: 'other_error',
                    message: log.message,
                    context: log,
                    timestamp: log.timestamp
                });
            }
        }

        return this.groupAndPrioritize(errors);
    }

    /**
     * Group errors by message similarity and prioritize
     */
    groupAndPrioritize(errors) {
        const groups = {};

        for (const error of errors) {
            // Simple clustering by message signature (first 50 chars)
            const signature = (error.message || '').substring(0, 50);
            if (!groups[signature]) {
                groups[signature] = {
                    signature,
                    count: 0,
                    firstOccurrence: error.timestamp,
                    lastOccurrence: error.timestamp,
                    examples: [],
                    score: 0
                };
            }
            groups[signature].count++;
            groups[signature].lastOccurrence = error.timestamp;
            if (groups[signature].examples.length < 3) {
                groups[signature].examples.push(error);
            }
        }

        return Object.values(groups)
            .map(g => {
                // Calculate Priority Score
                // Frequency * Recency Weight
                const recencyWeight = (Date.now() - new Date(g.lastOccurrence).getTime()) < 3600000 ? 2 : 1;
                g.score = g.count * recencyWeight;
                return g;
            })
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Map error pattern to likely source file
     * This is heuristic-based
     */
    guessSourceFile(errorSignature) {
        const sig = errorSignature.toLowerCase();

        if (sig.includes('ollama') || sig.includes('model') || sig.includes('fetch')) return 'packages/core/model-router.js';
        if (sig.includes('database') || sig.includes('sqlite') || sig.includes('sql')) return 'packages/core/database.js';
        if (sig.includes('approval') || sig.includes('server')) return 'packages/core/approval-server.js';
        if (sig.includes('dashboard') || sig.includes('frontend')) return 'packages/infrastructure/dashboard/dashboard.js';
        if (sig.includes('campaign') || sig.includes('email')) return 'packages/modules/email-campaigner.js';

        return null;
    }
}
