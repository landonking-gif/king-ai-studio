/**
 * Vercept VY Connector - Integration with Vercept's desktop AI assistant
 * Uses Vercept for complex desktop automation that requires a real UI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VerceptConnector {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/vercept');
        this.taskDir = path.join(this.dataDir, 'tasks');
        this.resultsDir = path.join(this.dataDir, 'results');
        this.ensureDirectories();

        // Vercept VY communicates via local sockets or file-based tasks
        // When fully integrated, this would use their API
        this.vyEndpoint = config.vyEndpoint || process.env.VERCEPT_ENDPOINT;
        this.vyApiKey = config.vyApiKey || process.env.VERCEPT_API_KEY;
    }

    ensureDirectories() {
        for (const dir of [this.dataDir, this.taskDir, this.resultsDir]) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    /**
     * Create a task file for Vercept VY to pick up
     * Vercept can watch a directory for task files
     */
    async createTask(task) {
        const taskId = `vy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        const taskFile = {
            id: taskId,
            type: task.type || 'instruction',
            instruction: task.instruction,
            application: task.application || null, // e.g., 'chrome', 'vscode', 'excel'
            context: task.context || {},
            priority: task.priority || 'normal',
            timeout: task.timeout || 300000, // 5 min default
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        const filePath = path.join(this.taskDir, `${taskId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(taskFile, null, 2));

        console.log(`[Vercept] Task created: ${taskId}`);
        console.log(`[Vercept] Instruction: ${task.instruction}`);

        return {
            success: true,
            taskId,
            taskFile: filePath,
            message: 'Task created. Vercept VY should pick this up if running.'
        };
    }

    /**
     * Check task status
     */
    async checkTaskStatus(taskId) {
        const taskFile = path.join(this.taskDir, `${taskId}.json`);
        const resultFile = path.join(this.resultsDir, `${taskId}-result.json`);

        if (!fs.existsSync(taskFile)) {
            return { success: false, error: 'Task not found' };
        }

        const task = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));

        // Check for result file
        if (fs.existsSync(resultFile)) {
            const result = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
            return {
                success: true,
                status: 'completed',
                task,
                result
            };
        }

        return {
            success: true,
            status: task.status,
            task
        };
    }

    /**
     * Wait for task completion
     */
    async waitForTask(taskId, timeoutMs = 300000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const status = await this.checkTaskStatus(taskId);

            if (status.status === 'completed') {
                return status;
            }

            if (status.status === 'failed') {
                return { success: false, error: 'Task failed', details: status };
            }

            await this.sleep(2000);
        }

        return { success: false, error: 'Task timeout' };
    }

    /**
     * Common desktop automation tasks
     */
    async automateDesktop(action, params = {}) {
        const templates = {
            // Open application and perform action
            'open_and_do': {
                instruction: `Open ${params.application}. Then ${params.then}`,
                application: params.application
            },

            // Fill a form in any application
            'fill_form': {
                instruction: `In ${params.application}: Fill the form with these values: ${JSON.stringify(params.values)}. Then click ${params.submitButton || 'Submit'}`,
                application: params.application
            },

            // Extract data from screen
            'extract_data': {
                instruction: `Look at ${params.application || 'the screen'} and extract ${params.what}. Save to ${params.saveAs || 'clipboard'}`,
                application: params.application
            },

            // Click through a workflow
            'workflow': {
                instruction: `In ${params.application}: ${params.steps.join('. Then ')}`,
                application: params.application
            },

            // Take screenshot with annotation
            'screenshot': {
                instruction: `Take a screenshot of ${params.what || 'the current screen'}${params.highlight ? ` and highlight ${params.highlight}` : ''}`,
                application: null
            },

            // Login to a service
            'login': {
                instruction: `Open ${params.url} in the browser. Login with username ${params.username}. Use the password from the password manager for ${params.service}`,
                application: 'browser'
            },

            // Send an email
            'email': {
                instruction: `Open ${params.emailClient || 'Gmail'} and compose an email to ${params.to}. Subject: ${params.subject}. Body: ${params.body}. Send it.`,
                application: 'browser'
            }
        };

        const template = templates[action];
        if (!template) {
            return { success: false, error: `Unknown action: ${action}` };
        }

        return this.createTask({
            type: 'instruction',
            instruction: template.instruction,
            application: template.application,
            context: params
        });
    }

    /**
     * Execute complex browser task that Puppeteer can't handle
     */
    async handleComplexBrowserTask(description) {
        return this.createTask({
            type: 'browser',
            instruction: description,
            application: 'browser',
            context: {
                requiresRealBrowser: true,
                reason: 'Too complex for headless automation'
            }
        });
    }

    /**
     * Handoff from Puppeteer when blocked
     */
    async handoffFromPuppeteer(reason, context) {
        return this.createTask({
            type: 'takeover',
            instruction: `Puppeteer automation was blocked (${reason}). Please complete this task manually: ${context.originalTask}`,
            application: 'browser',
            context: {
                blockedAt: context.currentUrl,
                screenshot: context.screenshotPath,
                reason,
                originalTask: context.originalTask
            }
        });
    }

    /**
     * Monitor a website/application for changes
     */
    async createMonitorTask(config) {
        return this.createTask({
            type: 'monitor',
            instruction: `Monitor ${config.target} for ${config.condition}. When triggered, ${config.action}`,
            application: config.application || 'browser',
            context: {
                checkInterval: config.interval || 60000,
                duration: config.duration || 3600000
            }
        });
    }

    /**
     * Get all pending tasks
     */
    getPendingTasks() {
        const files = fs.readdirSync(this.taskDir).filter(f => f.endsWith('.json'));
        const pending = [];

        for (const file of files) {
            const task = JSON.parse(fs.readFileSync(path.join(this.taskDir, file), 'utf-8'));
            if (task.status === 'pending') {
                pending.push(task);
            }
        }

        return pending;
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'create':
                return this.createTask(task.data);
            case 'status':
                return this.checkTaskStatus(task.data.taskId);
            case 'wait':
                return this.waitForTask(task.data.taskId, task.data.timeout);
            case 'automate':
                return this.automateDesktop(task.data.action, task.data.params);
            case 'handoff':
                return this.handoffFromPuppeteer(task.data.reason, task.data.context);
            case 'pending':
                return this.getPendingTasks();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default VerceptConnector;
