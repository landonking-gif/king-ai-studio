/**
 * Agent Scaler - Manages dynamic scaling of the agent worker pool
 * Scales from 7 to 100+ agents based on workload
 */

import { AgentPool } from '../agents/agent-pool.js';

export class AgentScaler {
    constructor(agentPool) {
        this.pool = agentPool;
        this.maxAgents = 100;
        this.minAgents = 5;
        this.scaleInterval = 5000; // Check every 5s
        this.isMonitoring = false;
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        this.monitorLoop = setInterval(async () => {
            await this.checkAndScale();
        }, this.scaleInterval);

        console.log('[AgentScaler] Monitoring started');
    }

    stopMonitoring() {
        if (this.monitorLoop) clearInterval(this.monitorLoop);
        this.isMonitoring = false;
    }

    async checkAndScale() {
        const stats = this.pool.getStats(); // Assuming AgentPool has this
        const queueLength = stats.queueLength || 0;
        const activeAgents = stats.activeAgents || 0;
        const totalAgents = stats.totalAgents || 0;

        // Scale Up Logic
        // If queue > 10 and agents all busy, add more
        if (queueLength > 10 && activeAgents >= totalAgents * 0.9) {
            if (totalAgents < this.maxAgents) {
                const toAdd = Math.min(5, this.maxAgents - totalAgents);
                console.log(`[AgentScaler] High load detected. Scaling up by +${toAdd} agents.`);
                this.pool.addWorkers(toAdd); // Assuming method exists
            }
        }

        // Scale Down Logic
        // If queue empty and agents idle for > 1 min
        else if (queueLength === 0 && activeAgents < totalAgents * 0.2) {
            if (totalAgents > this.minAgents) {
                const toRemove = Math.min(5, totalAgents - this.minAgents);
                console.log(`[AgentScaler] Low load. Scaling down by -${toRemove} agents.`);
                this.pool.removeWorkers(toRemove); // Assuming method exists
            }
        }
    }
}
export default AgentScaler;
