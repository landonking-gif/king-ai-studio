/**
 * Real Time Monitor - System observability
 * Live pulse of the Empire: Requests, Revenue, Errors, Agent Status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RealTimeMonitor {
    constructor(config = {}) {
        this.metrics = {
            revenue: 0,
            activeAgents: 0,
            requestsPerMin: 0,
            errorRate: 0,
            uptime: 0
        };
        this.history = [];
    }

    updateMetric(key, value) {
        if (this.metrics.hasOwnProperty(key)) {
            this.metrics[key] = value;
        }
    }

    snapshot() {
        const snap = {
            timestamp: new Date().toISOString(),
            metrics: { ...this.metrics }
        };
        this.history.push(snap);
        if (this.history.length > 1000) this.history.shift(); // Keep last 1000
        return snap;
    }

    getHealth() {
        if (this.metrics.errorRate > 5) return 'critical';
        if (this.metrics.errorRate > 1) return 'degraded';
        return 'healthy';
    }

    async execute(task) {
        if (task.action === 'update') return this.updateMetric(task.data.key, task.data.value);
        if (task.action === 'status') return { health: this.getHealth(), metrics: this.metrics };
    }
}
export default RealTimeMonitor;
