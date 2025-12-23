/**
 * Daily Summarizer - Generates and sends 6 PM Chicago daily reports
 * Compiles all actions, generates questions, and proposes next-day tasks
 */

import cron from 'node-cron';
import { AuditLogger } from './audit-logger.js';
import { EmailNotifier } from './email-notifier.js';

export class DailySummarizer {
    constructor(config = {}) {
        this.auditLogger = config.auditLogger || new AuditLogger();
        this.emailNotifier = config.emailNotifier || new EmailNotifier(config);
        this.db = config.db;
        this.timezone = config.timezone || 'America/Chicago';
        this.hour = config.hour ?? 18; // 6 PM
        this.minute = config.minute ?? 0;
        this.cronJob = null;
    }

    /**
     * Start the daily cron job
     */
    start() {
        // Cron format: minute hour * * * (every day at specified time)
        const cronExpression = `${this.minute} ${this.hour} * * *`;

        console.log(`Daily summarizer scheduled for ${this.hour}:${String(this.minute).padStart(2, '0')} ${this.timezone}`);

        this.cronJob = cron.schedule(cronExpression, () => {
            this.generateAndSend();
        }, {
            timezone: this.timezone
        });

        return this;
    }

    /**
     * Stop the cron job
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
    }

    /**
     * Generate questions based on today's activities
     */
    generateQuestions(logs) {
        const questions = [];

        // Check for failed tasks
        const failures = logs.filter(l => l.type === 'execution' && l.status === 'failed');
        if (failures.length > 0) {
            questions.push(`${failures.length} task(s) failed today. Should I retry them tomorrow or investigate further?`);
        }

        // Check for pending approvals
        const pending = logs.filter(l => l.type === 'proposal' && l.evaluation?.requiresApproval);
        if (pending.length > 0) {
            questions.push(`There are ${pending.length} pending approval(s). Would you like me to re-send the details?`);
        }

        // Check activity level
        if (logs.length === 0) {
            questions.push('No activities were logged today. Is there a specific task you would like me to start?');
        }

        return questions;
    }

    /**
     * Generate propositions for tomorrow
     */
    generatePropositions(logs) {
        const propositions = [];

        // Suggest regular maintenance tasks
        propositions.push({
            name: 'Document Organization',
            description: 'Review and organize any new documents added to the system',
            category: 'document_management'
        });

        // If there were failures, suggest retry
        const failures = logs.filter(l => l.type === 'execution' && l.status === 'failed');
        if (failures.length > 0) {
            propositions.push({
                name: 'Retry Failed Tasks',
                description: `Automatically retry the ${failures.length} failed task(s) from today`,
                category: 'task_retry'
            });
        }

        // Suggest backup
        propositions.push({
            name: 'Daily Data Backup',
            description: 'Create backup of all documents and logs',
            category: 'data_backup'
        });

        return propositions;
    }

    /**
     * Generate and send the daily summary
     */
    async generateAndSend() {
        console.log('Generating daily summary...');

        try {
            const summary = this.auditLogger.getDailySummary();
            let logs = this.auditLogger.getTodayLogs();

            if (this.db) {
                const today = new Date().toISOString().split('T')[0];
                const dbLogs = await this.db.db.all("SELECT * FROM logs WHERE timestamp LIKE ?", [`${today}%`]);
                // Merge or prioritize DB logs
                logs = dbLogs.length > 0 ? dbLogs : logs;
            }

            const questions = this.generateQuestions(logs);
            const propositions = this.generatePropositions(logs);

            await this.emailNotifier.sendDailySummary(summary, questions, propositions);

            // Log that we sent the summary
            this.auditLogger.logSystem('daily_summary_sent', {
                date: summary.date,
                totalActions: summary.totalActions,
                questionsCount: questions.length,
                propositionsCount: propositions.length
            });

            console.log('Daily summary sent successfully');
            return { success: true, summary };
        } catch (error) {
            console.error('Failed to send daily summary:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Manually trigger a summary (for testing)
     */
    async sendNow() {
        return this.generateAndSend();
    }
}

export default DailySummarizer;
