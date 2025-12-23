/**
 * Task Dispatcher - Unified routing layer for all system tasks
 * Routes CEO tasks to the appropriate module for execution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all modules
import { AccountManager } from '../integrations/account-manager.js';
import { N8nConnector } from '../integrations/n8n-connector.js';
import { ExternalToolsConnector } from '../integrations/external-tools.js';
import { BrowserWorker } from '../agents/browser-worker.js';
import { AccountCreator } from '../agents/account-creator.js';
import { PaymentProcessor } from '../modules/payment-processor.js';
import { SocialPublisher } from '../modules/social-publisher.js';
import { ClientManager } from '../modules/client-manager.js';
import { AuditLogger } from '../core/audit-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TaskDispatcher {
    constructor(config = {}) {
        this.config = config;
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/dispatcher');
        this.ensureDataDir();

        // Initialize all modules
        this.modules = {
            accountManager: new AccountManager(config),
            accountCreator: new AccountCreator(config),
            browserWorker: new BrowserWorker(config),
            n8n: new N8nConnector(config),
            externalTools: new ExternalToolsConnector(config),
            payments: new PaymentProcessor(config),
            social: new SocialPublisher(config),
            clients: new ClientManager(config)
        };

        this.auditLogger = config.auditLogger || new AuditLogger();

        // Task type to module mapping
        this.taskRoutes = {
            // Account operations
            'create_account': { module: 'accountCreator', action: 'create' },
            'get_account': { module: 'accountManager', action: 'get' },
            'rotate_account': { module: 'accountManager', action: 'rotate' },

            // Browser automation
            'browse': { module: 'browserWorker', action: 'execute_now' },
            'screenshot': { module: 'browserWorker', action: 'create_task' },
            'fill_form': { module: 'browserWorker', action: 'create_task' },

            // Social media
            'post_social': { module: 'social', action: 'post' },
            'login_social': { module: 'social', action: 'login' },
            'schedule_post': { module: 'social', action: 'schedule' },

            // n8n workflows
            'create_workflow': { module: 'n8n', action: 'create' },
            'trigger_workflow': { module: 'n8n', action: 'execute' },
            'create_webhook': { module: 'n8n', action: 'create_webhook' },

            // Payments & invoicing
            'create_invoice': { module: 'payments', action: 'create_invoice' },
            'send_invoice': { module: 'payments', action: 'generate_html' },
            'create_payment_link': { module: 'payments', action: 'create_payment_link' },

            // Client management
            'add_client': { module: 'clients', action: 'add' },
            'email_client': { module: 'clients', action: 'send_email' },
            'generate_proposal': { module: 'clients', action: 'generate_proposal' },
            'generate_contract': { module: 'clients', action: 'generate_contract' },
            'reply_email': { module: 'clients', action: 'generate_reply' },

            // External tools
            'external_task': { module: 'externalTools', action: 'createBrowserAgentTask' }
        };

        // Keyword-based routing for natural language tasks
        this.keywordRoutes = [
            { keywords: ['create account', 'sign up', 'register'], type: 'create_account' },
            { keywords: ['post to', 'tweet', 'publish', 'share on'], type: 'post_social' },
            { keywords: ['invoice', 'bill', 'charge'], type: 'create_invoice' },
            { keywords: ['payment link', 'pay online'], type: 'create_payment_link' },
            { keywords: ['add client', 'new client', 'new customer'], type: 'add_client' },
            { keywords: ['email', 'send message', 'contact'], type: 'email_client' },
            { keywords: ['proposal', 'quote'], type: 'generate_proposal' },
            { keywords: ['contract', 'agreement'], type: 'generate_contract' },
            { keywords: ['workflow', 'automation', 'n8n'], type: 'create_workflow' },
            { keywords: ['browse', 'navigate', 'visit', 'go to'], type: 'browse' },
            { keywords: ['screenshot', 'capture'], type: 'screenshot' }
        ];
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Dispatch a task to the appropriate module
     * @param {object} task - Task with type or description
     */
    async dispatch(task) {
        console.log(`[Dispatcher] Received task: ${task.type || task.description}`);

        // Determine task type
        let taskType = task.type;
        if (!taskType && task.description) {
            taskType = this.inferTaskType(task.description);
        }

        if (!taskType) {
            return {
                success: false,
                error: 'Could not determine task type',
                suggestion: 'Provide a task.type or task.description'
            };
        }

        // Get route
        const route = this.taskRoutes[taskType];
        if (!route) {
            return {
                success: false,
                error: `No route for task type: ${taskType}`,
                availableTypes: Object.keys(this.taskRoutes)
            };
        }

        // Get module
        const module = this.modules[route.module];
        if (!module) {
            return { success: false, error: `Module not found: ${route.module}` };
        }

        // Prepare task data
        const moduleTask = {
            action: route.action,
            data: task.data || task
        };

        // Log dispatch
        this.auditLogger.logSystem('task_dispatched', {
            taskType,
            module: route.module,
            action: route.action
        });

        try {
            // Execute
            const result = await module.execute(moduleTask);

            // Log result
            this.auditLogger.logSystem('task_completed', {
                taskType,
                success: result.success
            });

            return {
                success: true,
                taskType,
                module: route.module,
                result
            };

        } catch (error) {
            this.auditLogger.logSystem('task_failed', {
                taskType,
                error: error.message
            });

            return {
                success: false,
                taskType,
                module: route.module,
                error: error.message
            };
        }
    }

    /**
     * Infer task type from natural language description
     */
    inferTaskType(description) {
        const lower = description.toLowerCase();

        for (const route of this.keywordRoutes) {
            for (const keyword of route.keywords) {
                if (lower.includes(keyword)) {
                    return route.type;
                }
            }
        }

        return null;
    }

    /**
     * Dispatch multiple tasks in sequence
     */
    async dispatchSequence(tasks) {
        const results = [];

        for (const task of tasks) {
            const result = await this.dispatch(task);
            results.push(result);

            // Stop if task requires approval
            if (result.result?.requiresApproval) {
                return {
                    success: true,
                    halted: true,
                    reason: 'Approval required',
                    completedTasks: results,
                    pendingTask: task
                };
            }

            // Stop on failure if configured
            if (!result.success && task.stopOnFailure !== false) {
                return {
                    success: false,
                    halted: true,
                    reason: 'Task failed',
                    completedTasks: results,
                    failedTask: task
                };
            }
        }

        return { success: true, results };
    }

    /**
     * Dispatch tasks in parallel (where independent)
     */
    async dispatchParallel(tasks) {
        const promises = tasks.map(task => this.dispatch(task));
        const results = await Promise.allSettled(promises);

        return {
            success: results.every(r => r.status === 'fulfilled' && r.value.success),
            results: results.map((r, i) => ({
                task: tasks[i],
                status: r.status,
                result: r.status === 'fulfilled' ? r.value : r.reason
            }))
        };
    }

    /**
     * Get status of all modules
     */
    getModuleStatus() {
        return {
            accountManager: 'ready',
            accountCreator: 'ready',
            browserWorker: 'ready',
            n8n: 'ready (requires n8n running)',
            payments: 'ready (requires Stripe key for payment links)',
            social: 'ready',
            clients: 'ready'
        };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'dispatch':
                return this.dispatch(task.data);
            case 'sequence':
                return this.dispatchSequence(task.data.tasks);
            case 'parallel':
                return this.dispatchParallel(task.data.tasks);
            case 'status':
                return this.getModuleStatus();
            default:
                return this.dispatch(task);
        }
    }
}

export default TaskDispatcher;
