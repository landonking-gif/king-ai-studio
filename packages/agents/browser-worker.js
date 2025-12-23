/**
 * Browser Worker - Puppeteer-based browser automation agent
 * Watches for task files and executes browser actions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import for puppeteer (optional dependency)
let puppeteer = null;

export class BrowserWorker {
    constructor(config = {}) {
        this.tasksDir = config.tasksDir || path.join(__dirname, '../../data/tools');
        this.screenshotsDir = config.screenshotsDir || path.join(__dirname, '../../data/screenshots');
        this.watchInterval = config.watchInterval || 5000; // 5 seconds
        this.headless = config.headless !== false; // Default to headless
        this.isRunning = false;
        this.browser = null;
        this.page = null;

        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.tasksDir)) {
            fs.mkdirSync(this.tasksDir, { recursive: true });
        }
        if (!fs.existsSync(this.screenshotsDir)) {
            fs.mkdirSync(this.screenshotsDir, { recursive: true });
        }
    }

    /**
     * Initialize Puppeteer (lazy load)
     */
    async initBrowser() {
        if (!puppeteer) {
            try {
                puppeteer = (await import('puppeteer')).default;
            } catch (error) {
                throw new Error('Puppeteer not installed. Run: npm install puppeteer');
            }
        }

        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: this.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1280, height: 800 });
            console.log('[BrowserWorker] Browser initialized');
        }
    }

    /**
     * Close browser
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('[BrowserWorker] Browser closed');
        }
    }

    /**
     * Start watching for tasks
     */
    async startWatching() {
        this.isRunning = true;
        console.log(`[BrowserWorker] Watching for tasks in ${this.tasksDir}`);

        while (this.isRunning) {
            await this.checkForTasks();
            await this.sleep(this.watchInterval);
        }
    }

    /**
     * Stop watching
     */
    stopWatching() {
        this.isRunning = false;
        console.log('[BrowserWorker] Stopped watching');
    }

    /**
     * Check for pending tasks
     */
    async checkForTasks() {
        const files = fs.readdirSync(this.tasksDir)
            .filter(f => f.endsWith('-task.json'));

        for (const file of files) {
            const taskPath = path.join(this.tasksDir, file);
            try {
                const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

                if (task.status === 'pending') {
                    console.log(`[BrowserWorker] Found pending task: ${task.id}`);
                    await this.executeTask(task, taskPath);
                }
            } catch (error) {
                console.error(`[BrowserWorker] Error reading task ${file}:`, error.message);
            }
        }
    }

    /**
     * Execute a browser task
     */
    async executeTask(task, taskPath) {
        // Mark as in progress
        task.status = 'in_progress';
        task.startedAt = new Date().toISOString();
        fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

        try {
            await this.initBrowser();

            const results = [];

            // Execute each step
            for (const step of task.steps || []) {
                console.log(`[BrowserWorker] Executing step: ${step.action}`);
                const result = await this.executeStep(step);
                results.push(result);

                if (!result.success) {
                    throw new Error(`Step failed: ${step.action} - ${result.error}`);
                }
            }

            // If no steps but has URL, just navigate
            if ((!task.steps || task.steps.length === 0) && task.url) {
                await this.page.goto(task.url, { waitUntil: 'networkidle2' });
                results.push({ action: 'navigate', success: true, url: task.url });
            }

            // Take final screenshot
            const screenshotPath = path.join(this.screenshotsDir, `${task.id}.png`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });

            // Mark as completed
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            task.results = results;
            task.screenshotPath = screenshotPath;
            fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

            console.log(`[BrowserWorker] Task ${task.id} completed successfully`);

        } catch (error) {
            console.error(`[BrowserWorker] Task ${task.id} failed:`, error.message);

            task.status = 'failed';
            task.failedAt = new Date().toISOString();
            task.error = error.message;
            fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
        }
    }

    /**
     * Execute a single step
     */
    async executeStep(step) {
        try {
            switch (step.action) {
                case 'navigate':
                case 'goto':
                    await this.page.goto(step.url, { waitUntil: 'networkidle2', timeout: 30000 });
                    return { action: step.action, success: true, url: step.url };

                case 'click':
                    await this.page.waitForSelector(step.selector, { timeout: 10000 });
                    await this.page.click(step.selector);
                    return { action: 'click', success: true, selector: step.selector };

                case 'type':
                case 'fill':
                    await this.page.waitForSelector(step.selector, { timeout: 10000 });
                    if (step.clear) {
                        await this.page.click(step.selector, { clickCount: 3 });
                    }
                    await this.page.type(step.selector, step.value, { delay: step.delay || 50 });
                    return { action: 'type', success: true, selector: step.selector };

                case 'wait':
                    if (step.selector) {
                        await this.page.waitForSelector(step.selector, { timeout: step.timeout || 10000 });
                    } else {
                        await this.sleep(step.duration || 1000);
                    }
                    return { action: 'wait', success: true };

                case 'screenshot':
                    const filename = step.filename || `screenshot-${Date.now()}.png`;
                    const ssPath = path.join(this.screenshotsDir, filename);
                    await this.page.screenshot({ path: ssPath, fullPage: step.fullPage !== false });
                    return { action: 'screenshot', success: true, path: ssPath };

                case 'scroll':
                    await this.page.evaluate((scrollY) => {
                        window.scrollBy(0, scrollY);
                    }, step.amount || 500);
                    return { action: 'scroll', success: true };

                case 'select':
                    await this.page.waitForSelector(step.selector, { timeout: 10000 });
                    await this.page.select(step.selector, step.value);
                    return { action: 'select', success: true, selector: step.selector };

                case 'waitForNavigation':
                    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
                    return { action: 'waitForNavigation', success: true };

                case 'evaluate':
                    const evalResult = await this.page.evaluate(step.script);
                    return { action: 'evaluate', success: true, result: evalResult };

                case 'extract':
                    await this.page.waitForSelector(step.selector, { timeout: 10000 });
                    const extracted = await this.page.$eval(step.selector, (el, attr) => {
                        return attr ? el.getAttribute(attr) : el.textContent;
                    }, step.attribute);
                    return { action: 'extract', success: true, value: extracted };

                default:
                    return { action: step.action, success: false, error: `Unknown action: ${step.action}` };
            }
        } catch (error) {
            return { action: step.action, success: false, error: error.message };
        }
    }

    /**
     * Create a task file for another agent to pick up
     */
    createTask(agent, taskData) {
        const task = {
            id: `browser-task-${Date.now()}`,
            agent,
            task: taskData.description,
            steps: taskData.steps || [],
            url: taskData.url,
            expectedOutcome: taskData.expectedOutcome,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        const taskPath = path.join(this.tasksDir, `${agent}-task.json`);
        fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

        return { success: true, taskId: task.id, taskPath };
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
            case 'start_watching':
                this.startWatching(); // Don't await, runs in background
                return { success: true, message: 'Started watching for tasks' };
            case 'stop_watching':
                this.stopWatching();
                return { success: true, message: 'Stopped watching' };
            case 'create_task':
                return this.createTask(task.data.agent, task.data);
            case 'execute_now':
                return this.executeTask(task.data, task.data.path);
            case 'close':
                await this.closeBrowser();
                return { success: true };
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default BrowserWorker;
