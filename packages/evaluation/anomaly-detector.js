/**
 * Anomaly Detector - Monitors system behavior and triggers alerts
 * Part of the Evaluation Layer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuditLogger } from '../core/audit-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AnomalyDetector {
    constructor(config = {}) {
        this.auditLogger = config.auditLogger || new AuditLogger();
        this.thresholds = {
            failureRate: config.maxFailureRate || 0.3, // 30% failure rate
            executionsPerHour: config.maxExecutionsPerHour || 100,
            errorsPerHour: config.maxErrorsPerHour || 10,
            ...config.thresholds
        };
        this.alertHandlers = [];
        this.isPaused = false;
    }

    /**
     * Register an alert handler
     */
    onAlert(handler) {
        this.alertHandlers.push(handler);
    }

    /**
     * Trigger an alert
     */
    async triggerAlert(type, details) {
        const alert = {
            type,
            timestamp: new Date().toISOString(),
            details,
            systemPaused: this.isPaused
        };

        this.auditLogger.logSystem('anomaly_detected', alert);

        for (const handler of this.alertHandlers) {
            try {
                await handler(alert);
            } catch (err) {
                console.error('Alert handler failed:', err.message);
            }
        }

        return alert;
    }

    /**
     * Check failure rate
     */
    checkFailureRate() {
        const logs = this.auditLogger.getTodayLogs();
        const executions = logs.filter(l => l.type === 'execution');

        if (executions.length < 5) {
            return { anomaly: false, message: 'Not enough data' };
        }

        const failures = executions.filter(e => e.status === 'failed').length;
        const rate = failures / executions.length;

        if (rate > this.thresholds.failureRate) {
            return {
                anomaly: true,
                type: 'high_failure_rate',
                rate,
                threshold: this.thresholds.failureRate,
                message: `Failure rate ${(rate * 100).toFixed(1)}% exceeds ${this.thresholds.failureRate * 100}%`
            };
        }

        return { anomaly: false, rate };
    }

    /**
     * Check execution volume
     */
    checkExecutionVolume() {
        const logs = this.auditLogger.getTodayLogs();
        const now = new Date();
        const hourAgo = new Date(now - 60 * 60 * 1000);

        const recentExecutions = logs.filter(l => {
            return l.type === 'execution' && new Date(l.timestamp) > hourAgo;
        });

        if (recentExecutions.length > this.thresholds.executionsPerHour) {
            return {
                anomaly: true,
                type: 'high_volume',
                count: recentExecutions.length,
                threshold: this.thresholds.executionsPerHour,
                message: `${recentExecutions.length} executions in last hour exceeds ${this.thresholds.executionsPerHour}`
            };
        }

        return { anomaly: false, count: recentExecutions.length };
    }

    /**
     * Run all checks
     */
    async runAllChecks() {
        const results = {
            timestamp: new Date().toISOString(),
            checks: [],
            anomaliesDetected: 0,
            systemHealthy: true
        };

        // Failure rate check
        const failureCheck = this.checkFailureRate();
        results.checks.push({ name: 'failure_rate', ...failureCheck });
        if (failureCheck.anomaly) {
            results.anomaliesDetected++;
            results.systemHealthy = false;
            await this.triggerAlert('high_failure_rate', failureCheck);
        }

        // Volume check
        const volumeCheck = this.checkExecutionVolume();
        results.checks.push({ name: 'execution_volume', ...volumeCheck });
        if (volumeCheck.anomaly) {
            results.anomaliesDetected++;
            await this.triggerAlert('high_volume', volumeCheck);
        }

        return results;
    }

    /**
     * Pause system (kill switch)
     */
    pause(reason) {
        this.isPaused = true;
        this.auditLogger.logSystem('system_paused', { reason });
        return { paused: true, reason };
    }

    /**
     * Resume system
     */
    resume() {
        this.isPaused = false;
        this.auditLogger.logSystem('system_resumed', {});
        return { paused: false };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'check_all':
                return this.runAllChecks();
            case 'check_failures':
                return this.checkFailureRate();
            case 'check_volume':
                return this.checkExecutionVolume();
            case 'pause':
                return this.pause(task.data?.reason || 'Manual pause');
            case 'resume':
                return this.resume();
            case 'status':
                return { isPaused: this.isPaused };
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default AnomalyDetector;
