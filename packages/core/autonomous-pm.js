/**
 * AutonomousPM - Implements ROI Improvement #99
 * The "Project Manager" that assigns tasks and deadlines to sub-agents.
 */

export class AutonomousPM {
    constructor(config = {}) {
        this.ceo = config.ceo;
    }

    /**
     * Triage and assign tasks
     */
    async triageTasks(taskList) {
        console.log(`[AutonomousPM] Triaging ${taskList.length} tasks...`);

        const assignments = taskList.map(t => ({
            task: t.name,
            assigned_to: this.assignAgent(t),
            priority: t.priority || 'NORMAL',
            deadline: new Date(Date.now() + 86400000).toISOString() // +24h
        }));

        return { success: true, assignments };
    }

    assignAgent(task) {
        if (task.name.includes('code') || task.name.includes('fix')) return 'SelfRefactorer';
        if (task.name.includes('sell') || task.name.includes('call')) return 'SalesCloser';
        if (task.name.includes('write') || task.name.includes('post')) return 'ContentArbitrage';
        return 'GeneralWorker';
    }
}

export default AutonomousPM;
