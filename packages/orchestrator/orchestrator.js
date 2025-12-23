import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { PolicyEngine, AuditLogger, ApprovalFlow, DailySummarizer, EmailNotifier, ModelRouter, Database } from '../core/index.js';
import { SelfImprovement } from '../core/self-improvement.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Orchestrator {
    constructor(config = {}) {
        this.config = config;

        // Initialize core components
        this.policyEngine = new PolicyEngine(config);
        this.auditLogger = new AuditLogger(config);
        this.emailNotifier = new EmailNotifier(config);
        this.ai = new ModelRouter(config);
        this.db = config.db || new Database(config);
        this.selfImprovement = new SelfImprovement({ ...config, modelRouter: this.ai });

        this.pendingFile = config.pendingFile || path.join(__dirname, '../../data/ceo/pending-approvals.json');
        this.approvalFlow = new ApprovalFlow({
            ...config,
            pendingFile: this.pendingFile,
            policyEngine: this.policyEngine,
            emailNotifier: this.emailNotifier,
            auditLogger: this.auditLogger,
            db: this.db
        });
        this.dailySummarizer = new DailySummarizer({
            ...config,
            auditLogger: this.auditLogger,
            emailNotifier: this.emailNotifier,
            db: this.db
        });

        // Task queue
        this.taskQueue = [];
        this.runningTasks = new Map();
        this.modules = new Map();
        this.deadLetterQueue = []; // Dead letter queue for failed tasks

        // Priority weights
        this.priorityWeights = {
            impact: 0.4,
            urgency: 0.3,
            effort: -0.2, // Negative because lower effort = higher priority
            risk: -0.1    // Negative because lower risk = higher priority
        };

        this.rl = null;
        this.awaitingExternally = new Map(); // Track tasks pending in ApprovalFlow
        this.isRunning = false;
        this.pendingConfirmation = null; // Store pending task for confirmation
    }

    async init() {
        await this.db.init();
        await this.loadQueue();
        return this;
    }

    async loadQueue() {
        this.taskQueue = await this.db.getQueuedTasks();
    }

    /**
     * Register a module with the orchestrator
     */
    registerModule(name, moduleInstance) {
        this.modules.set(name, moduleInstance);
        this.auditLogger.logSystem('module_registered', { name });
        console.log(`Module registered: ${name}`);
    }

    /**
     * Calculate priority score for a task
     */
    calculatePriority(task) {
        const impact = task.impact ?? 5;
        const urgency = task.urgency ?? 5;
        const effort = task.effort ?? 5;
        const risk = task.risk ?? 5;

        return (
            impact * this.priorityWeights.impact +
            urgency * this.priorityWeights.urgency +
            effort * this.priorityWeights.effort +
            risk * this.priorityWeights.risk
        );
    }

    /**
     * Submit a task to the orchestrator
     */
    async submitTask(task) {
        // Enrich task with metadata
        task.id = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        task.submittedAt = new Date().toISOString();
        task.priority = this.calculatePriority(task);
        task.status = 'queued';

        // Save to DB
        await this.db.saveTask({
            ...task,
            business_id: task.businessId || 'system',
            created_at: task.submittedAt
        });

        // Check approval
        const approvalResult = await this.approvalFlow.submit(task);

        if (approvalResult.approved) {
            // Add to queue sorted by priority
            this.taskQueue.push(task);
            this.taskQueue.sort((a, b) => b.priority - a.priority);

            return {
                status: 'queued',
                taskId: task.id,
                priority: task.priority,
                position: this.taskQueue.findIndex(t => t.id === task.id) + 1
            };
        } else {
            // Update status in DB
            task.status = 'pending_approval';
            await this.db.saveTask({ ...task, business_id: task.businessId || 'system' });

            // Track task that needs approval
            this.awaitingExternally.set(task.id, task);
            return {
                status: 'pending_approval',
                taskId: task.id,
                reason: approvalResult.reason
            };
        }
    }

    /**
     * Execute the next task in queue
     */
    async executeNext() {
        if (this.taskQueue.length === 0) {
            return { status: 'empty', message: 'No tasks in queue' };
        }

        const task = this.taskQueue.shift();
        this.runningTasks.set(task.id, task);

        task.status = 'running';
        await this.db.saveTask({ ...task, business_id: task.businessId || 'system' });

        this.auditLogger.logExecution(task.id, 'started');

        try {
            // Find the appropriate module
            const module = this.modules.get(task.module);

            if (!module) {
                throw new Error(`Module not found: ${task.module}`);
            }

            // Execute the task
            const result = await module.execute(task);

            task.status = 'completed';
            task.result = result;
            await this.db.saveTask({ ...task, business_id: task.businessId || 'system' });

            this.auditLogger.logExecution(task.id, 'completed', result);
            this.runningTasks.delete(task.id);

            // Optional: Trigger self-improvement if it's a major task
            if (task.impact >= 7) {
                this.selfImprovement.optimizeCycle().catch(console.error);
            }

            return {
                status: 'completed',
                taskId: task.id,
                result
            };
        } catch (error) {
            task.status = 'failed';
            task.error = error.message;
            await this.db.saveTask({ ...task, business_id: task.businessId || 'system' });

            this.auditLogger.logExecution(task.id, 'failed', { error: error.message });
            this.runningTasks.delete(task.id);

            // Add to dead letter queue
            this.deadLetterQueue.push(task);

            return {
                status: 'failed',
                taskId: task.id,
                error: error.message
            };
        }
    }

    /**
     * Process all queued tasks
     */
    async processQueue() {
        const results = [];

        while (this.taskQueue.length > 0) {
            const result = await this.executeNext();
            results.push(result);
        }

        return results;
    }

    /**
     * Start the orchestrator (daily summarizer, etc.)
     */
    async start() {
        console.log('Starting King AI Studio Orchestrator...');
        this.isRunning = true;

        // Initialize email notifier
        await this.emailNotifier.init();

        // Start daily summarizer
        this.dailySummarizer.start();

        // Log startup
        this.auditLogger.logSystem('orchestrator_started', {
            modules: Array.from(this.modules.keys()),
            config: {
                dailySummaryTime: `${this.config.hour ?? 18}:${String(this.config.minute ?? 0).padStart(2, '0')}`,
                timezone: this.config.timezone || 'America/Chicago'
            }
        });

        console.log('Orchestrator started successfully');

        // Start execution loop
        this.runExecutionLoop();

        // Start interactive REPL if in a TTY environment
        if (process.stdin.isTTY) {
            this.startREPL();
        }

        return this;
    }

    /**
     * Autonomous execution loop
     */
    async runExecutionLoop() {
        while (this.isRunning) {
            // Check for pending external approvals
            await this.checkExternalApprovals();

            if (this.taskQueue.length > 0 && this.runningTasks.size === 0) {
                await this.executeNext();
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    /**
     * Watch for approvals in the ApprovalFlow
     */
    async checkExternalApprovals() {
        if (this.awaitingExternally.size === 0) return;

        // The ApprovalFlow marks items as approved/rejected in its data file.
        // We'll use getStatus to check our tracked tasks.
        for (const [taskId, task] of this.awaitingExternally) {
            const status = await this.approvalFlow.getStatus(taskId);

            if (status.found && status.status !== 'pending') {
                this.awaitingExternally.delete(taskId);

                if (status.status === 'approved') {
                    console.log(`\n🔔 Task ${taskId} was approved externally. Re-queueing...`);
                    await this.submitTask(task);
                    if (this.rl) this.rl.prompt();
                } else {
                    console.log(`\n🚫 Task ${taskId} was rejected externally.`);
                    if (this.rl) this.rl.prompt();
                }
            }
        }
    }

    /**
     * Start the interactive REPL
     */
    startREPL() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '👑 King-AI > '
        });

        console.log('\n💬 Interactive Mode Activated. Type "help" for commands.\n');
        this.rl.prompt();

        this.rl.on('line', async (line) => {
            const input = line.trim();
            if (!input) {
                this.rl.prompt();
                return;
            }

            await this.handleInput(input);
            if (this.rl && !this.rl.closed) {
                this.rl.prompt();
            }
        }).on('close', () => {
            console.log('\nExiting Interactive Mode...');
            this.stop();
        });
    }

    /**
     * Handle user input from REPL
     */
    async handleInput(input) {
        // Handle pending confirmation
        if (this.pendingConfirmation) {
            const lower = input.toLowerCase();
            if (lower === 'y' || lower === 'yes') {
                await this.submitTask(this.pendingConfirmation);
                console.log(`✅ Task queued: ${this.pendingConfirmation.module}.${this.pendingConfirmation.description}`);
            } else {
                console.log('❌ Action cancelled.');
            }
            this.pendingConfirmation = null;
            if (this.rl) this.rl.prompt();
            return;
        }

        const [command, ...args] = input.split(' ');
        const fullArg = args.join(' ');

        // Handle prefixed commands
        if (input.startsWith('talk:') || input.startsWith('chat:')) {
            const query = input.substring(input.indexOf(':') + 1).trim();
            await this.handleConversation(query);
            return;
        }

        if (input.startsWith('exec:') || input.startsWith('execute:')) {
            const query = input.substring(input.indexOf(':') + 1).trim();
            console.log(`🧠 Converting to task: "${query}"...`);
            const interpretation = await this.interpretCommand(query);
            if (interpretation && interpretation.module) {
                await this.submitTask(interpretation);
                console.log(`✅ Task queued: ${interpretation.module}.${interpretation.action}`);
            } else {
                console.log('❌ Could not interpret task.');
            }
            return;
        }

        switch (command.toLowerCase()) {
            case 'help':
                this.showHelp();
                break;
            case 'status':
                console.log(JSON.stringify(this.getStatus(), null, 2));
                break;
            case 'tasks':
                this.showTasks();
                break;
            case 'analyze':
                if (!fullArg) {
                    console.log('Usage: analyze "your business idea"');
                } else {
                    await this.submitTask({
                        module: 'ceo',
                        action: 'start',
                        description: `User-requested analysis: ${fullArg}`,
                        data: { description: fullArg },
                        impact: 8,
                        urgency: 7
                    });
                    console.log(`✅ Task queued: Analyze "${fullArg}"`);
                }
                break;
            case 'approvals': // shortcut for showing pending approvals
                const pending = this.approvalFlow.getPending();
                if (pending.length === 0) console.log('No pending approvals.');
                else pending.forEach(p => console.log(`[${p.task.id}] ${p.task.description || p.task.title}`));
                break;
            case 'approve':
                if (!fullArg) {
                    console.log('Usage: approve <taskId>');
                } else {
                    const approvalResult = this.approvalFlow.respond(fullArg, true, 'User CLI approval');
                    if (approvalResult.success) {
                        console.log('✅ Approved and re-submitted to queue.');
                        await this.submitTask(approvalResult.task);
                    } else {
                        console.log('❌ Approval failed:', approvalResult.error);
                    }
                }
                break;
            case 'exit':
            case 'quit':
                this.rl.close();
                break;
            default:
                // Default: Safe Interpretation (Ask before acting)
                console.log(`🤔 Interpreting: "${input}"...`);
                const interpretation = await this.interpretCommand(input);

                if (interpretation && interpretation.module) {
                    console.log('\n📋 Proposed Action:');
                    console.log(`   Module: ${interpretation.module}`);
                    console.log(`   Action: ${interpretation.action}`);
                    console.log(`   Description: ${interpretation.description}`);
                    console.log('\n❓ Do you want to execute this? (y/n)');

                    this.pendingConfirmation = interpretation;
                } else {
                    // Fallback to conversation if it doesn't look like a task
                    await this.handleConversation(input);
                }
                break;
        }
    }

    /**
     * Handle conversational input
     */
    async handleConversation(query) {
        console.log('💬 Thinking...');
        const prompt = `You are King AI, an autonomous business orchestrator. 
The user is talking to you directly.
User: "${query}"

Provide a helpful, professional, and concise response. 
If the user wants to take action, remind them to use "exec:" or specific commands.`;

        const result = await this.ai.complete(prompt, 'fast');
        console.log(`\n🤖 King AI: ${result.content}\n`);
    }

    /**
     * Use AI to interpret natural language commands
     */
    async interpretCommand(input) {
        const prompt = `Interpret this user command for an autonomous business builder.
Command: "${input}"

Available modules: ${Array.from(this.modules.keys()).join(', ')}

Return a JSON object representing a task:
{
  "module": "module_name",
  "action": "action_name",
  "data": {},
  "description": "Short description",
  "impact": 1-10,
  "urgency": 1-10
}

If you cannot interpret it as a task, return an empty object.`;

        const result = await this.ai.complete(prompt, 'fast');
        if (result.success) {
            try {
                return JSON.parse(result.content);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Show help menu
     */
    showHelp() {
        console.log('\n📜 Available Commands:');
        console.log('  talk: <msg>        Chat with the AI (e.g. "talk: how are my businesses?")');
        console.log('  exec: <cmd>        Force execution (e.g. "exec: start a bakery")');
        console.log('  status             Show system status');
        console.log('  tasks              Show task queue');
        console.log('  approvals          List pending approvals');
        console.log('  analyze "idea"     Start business analysis');
        console.log('  approve <taskId>   Approve a pending task');
        console.log('  help               Show this help menu');
        console.log('  exit / quit        Close the orchestrator\n');
        console.log('  💡 Purely conversational inputs will be answered.');
        console.log('  💡 Task-like inputs will ask for confirmation (y/n).\n');
    }

    /**
     * Show task queue
     */
    showTasks() {
        console.log(`\n📋 Task Queue (${this.taskQueue.length} tasks):`);
        this.taskQueue.forEach((t, i) => {
            console.log(`  ${i + 1}. [${t.module}] ${t.description} (Priority: ${t.priority.toFixed(2)})`);
        });
        if (this.runningTasks.size > 0) {
            console.log(`\n⚙️ Running Tasks (${this.runningTasks.size}):`);
            for (const [id, t] of this.runningTasks) {
                console.log(`  - [${t.module}] ${t.description} (ID: ${id})`);
            }
        }
        console.log('');
    }

    /**
     * Stop the orchestrator
     */
    stop() {
        this.isRunning = false;
        this.dailySummarizer.stop();
        this.auditLogger.logSystem('orchestrator_stopped');
        console.log('Orchestrator stopped');
    }

    /**
     * Retry tasks from dead letter queue
     */
    async retryDeadLetterQueue() {
        const tasks = [...this.deadLetterQueue];
        this.deadLetterQueue = [];
        for (const task of tasks) {
            task.status = 'queued';
            task.retryCount = (task.retryCount || 0) + 1;
            await this.submitTask(task);
        }
        console.log(`Retried ${tasks.length} tasks from DLQ`);
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            queuedTasks: this.taskQueue.length,
            runningTasks: this.runningTasks.size,
            deadLetterQueue: this.deadLetterQueue.length,
            pendingApprovals: this.approvalFlow.getPending().length,
            registeredModules: Array.from(this.modules.keys()),
            todaysSummary: this.auditLogger.getDailySummary()
        };
    }
}

export default Orchestrator;
