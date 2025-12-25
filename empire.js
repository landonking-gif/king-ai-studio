/**
 * Empire - Unified Autonomous Business Runner
 * The single entry point for running the complete autonomous empire
 * 
 * Usage: node empire.js "Your business idea here"
 *        node empire.js --daemon   (run continuously)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Core imports
import { ModelRouter } from './packages/core/model-router.js';
import { Database } from './packages/core/database.js';
import { AuditLogger } from './packages/core/audit-logger.js';
import { EmailNotifier } from './packages/core/email-notifier.js';
import { PolicyEngine } from './packages/core/policy-engine.js';
import { ApprovalServer } from './packages/core/approval-server.js';
import { SelfImprovement } from './packages/core/self-improvement.js';

// CEO imports
import { CEOAgent } from './packages/ceo/ceo-agent.js';
import { BusinessAnalyzer } from './packages/ceo/business-analyzer.js';

// Orchestrator
import { Orchestrator } from './packages/orchestrator/index.js';
import { TaskDispatcher } from './packages/orchestrator/task-dispatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

class Empire {
    constructor(config = {}) {
        this.config = config;
        this.isRunning = false;

        // Initialize core components
        this.ai = new ModelRouter(config);
        this.db = new Database(config);

        this.auditLogger = new AuditLogger();
        this.policyEngine = new PolicyEngine();
        this.selfImprovement = new SelfImprovement({ modelRouter: this.ai });

        // Email notifier (if configured)
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
            this.emailNotifier = new EmailNotifier({
                gmailUser: process.env.GMAIL_USER,
                gmailPassword: process.env.GMAIL_APP_PASSWORD,
                recipientEmail: process.env.NOTIFICATION_EMAIL || 'landon.king@luxebuildmedia.com'
            });
        }

        // Approval server
        this.approvalServer = new ApprovalServer({
            port: config.approvalPort || 3847,
            db: this.db,
            emailNotifier: this.emailNotifier,
            onApproval: (item) => this.handleApproval(item),
            onRejection: (item) => this.handleRejection(item)
        });

        // Task dispatcher (routes to all modules)
        this.dispatcher = new TaskDispatcher({
            modelRouter: this.ai,
            auditLogger: this.auditLogger
        });

        // Business analyzer
        this.analyzer = new BusinessAnalyzer({
            modelRouter: this.ai,
            auditLogger: this.auditLogger
        });

        // CEO Agent
        this.ceo = new CEOAgent({
            modelRouter: this.ai,
            db: this.db,
            auditLogger: this.auditLogger,
            emailNotifier: this.emailNotifier,
            policyEngine: this.policyEngine
        });

        // Meta-Orchestrator
        this.orchestrator = new Orchestrator({
            ...config,
            modelRouter: this.ai,
            db: this.db,
            auditLogger: this.auditLogger,
            emailNotifier: this.emailNotifier,
            policyEngine: this.policyEngine
        });

        // Connect shared components
        this.ceo.approvalFlow = this.orchestrator.approvalFlow;
        this.ceo.emailNotifier = this.orchestrator.emailNotifier;

        // Register modules with orchestrator
        this.orchestrator.registerModule('ceo', this.ceo);
        this.orchestrator.registerModule('analyzer', this.analyzer);
        this.orchestrator.registerModule('dispatcher', this.dispatcher);
        this.orchestrator.registerModule('system', this);
    }

    /**
     * Initialize the empire
     */
    async initialize() {
        try {
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║           👑 KING AI STUDIO - AUTONOMOUS EMPIRE          ║');
            console.log('╠══════════════════════════════════════════════════════════╣');
            console.log('║  The AI that builds businesses while you sleep           ║');
            console.log('╚══════════════════════════════════════════════════════════╝\n');

            // Initialize Database
            console.log('🗄️ Initializing Database...');
            await this.db.init();

            // Check AI availability
            console.log('🔍 Checking AI availability...');
            const ollamaStatus = await this.ai.checkOllama();
            if (!ollamaStatus.available) {
                console.log('⚠️ Ollama is not running. Falling back to Cloud/Simulation Mode.');
                this.simulationMode = true;
            } else {
                console.log(`✅ Ollama connected (${ollamaStatus.models.length} models available)`);
                this.simulationMode = false;
            }

            // Start approval server
            console.log('🌐 Starting dashboard server...');
            await this.approvalServer.init();
            await this.approvalServer.start();

            // Start Orchestrator
            console.log('🧠 Starting Meta-Orchestrator...');
            await this.orchestrator.init();
            await this.orchestrator.start();

            // Initialize CEO
            console.log('👔 Initializing CEO Agent...');
            await this.ceo.init();

            // Connect CEO Command Interface
            this.approvalServer.setCommandHandler((cmd) => this.ceo.handleCommand(cmd));
            this.approvalServer.setStatusProvider(() => this.ceo.getStatus());

            console.log('\n📊 System Status:');
            console.log(`   • AI: ${ollamaStatus.available ? '✅ Local Ready' : '🌐 Cloud Only'}`);
            console.log(`   • Email: ${this.emailNotifier ? '✅ Configured' : '⚠️ Not configured'}`);
            console.log(`   • Dashboard: http://localhost:${this.approvalServer.port}`);
            console.log('   • Database: ✅ PostgreSQL (king_ai)');
            console.log('');

            if (this.emailNotifier) await this.emailNotifier.init();

            return true;
        } catch (error) {
            console.error('Error during Empire initialization:', error);
            throw error;
        }
    }

    /**
     * Run a single business from an idea via Orchestrator
     */
    async runBusiness(idea) {
        try {
            console.log(`\n🚀 Submitting business idea to Orchestrator: "${idea}"\n`);

            return this.orchestrator.submitTask({
                module: 'ceo',
                action: 'start',
                description: `Build business: ${idea}`,
                data: { description: idea },
                impact: 9,
                urgency: 8
            });
        } catch (error) {
            console.error('Error in runBusiness:', error);
            throw error;
        }
    }

    /**
     * Execute plan using the task dispatcher
     */
    async executePlanWithDispatcher() {
        try {
            const status = this.ceo.getStatus();
            if (!status.activeBusiness) {
                return { success: false, error: 'No active business' };
            }

            const tasks = status.activeBusiness.tasks || [];
            const results = [];

            for (const task of tasks) {
                if (task.status === 'completed') continue;

                console.log(`\n📌 Task: ${task.name || task.title}`);

                // Check if task requires approval
                const policyCheck = this.policyEngine.evaluate(task);

                if (policyCheck.requiresApproval) {
                    console.log(`⏸️ Approval required: ${policyCheck.reason}`);

                    // Add to approval queue
                    this.approvalServer.addApproval({
                        taskType: task.type || 'business_task',
                        description: (task.name || task.title) + '\n' + (task.description || ''),
                        data: task,
                        riskLevel: policyCheck.reason
                    });

                    // Wait for approval
                    const approved = await this.waitForApproval(task);
                    if (!approved) {
                        console.log('❌ Task rejected or timed out');
                        results.push({ task: task.name || task.title, status: 'rejected' });
                        continue;
                    }
                }

                // Dispatch the task
                const dispatchResult = await this.dispatcher.dispatch({
                    type: this.inferTaskType(task),
                    description: task.name || task.title,
                    data: task
                });

                if (dispatchResult.success) {
                    console.log(`✅ Task completed`);
                    task.status = 'completed';
                } else {
                    console.log(`⚠️ Task needs manual handling: ${dispatchResult.error || 'No matching automation'}`);
                    task.status = 'manual_required';
                }

                results.push({
                    task: task.name || task.title,
                    status: task.status,
                    result: dispatchResult
                });
            }

            return { success: true, results };
        } catch (error) {
            console.error('Error in executePlanWithDispatcher:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Infer task type for dispatcher
     */
    inferTaskType(task) {
        const title = (task.name || task.title || '').toLowerCase();

        if (title.includes('account') || title.includes('sign up')) return 'create_account';
        if (title.includes('post') || title.includes('social')) return 'post_social';
        if (title.includes('invoice')) return 'create_invoice';
        if (title.includes('email') || title.includes('contact')) return 'email_client';
        if (title.includes('client')) return 'add_client';
        if (title.includes('proposal')) return 'generate_proposal';
        if (title.includes('contract')) return 'generate_contract';
        if (title.includes('register domain')) return 'register_domain';
        if (title.includes('deploy')) return 'deploy_website';

        if (title.includes('website') || title.includes('browse')) return 'browse';

        return 'external_task';
    }

    /**
     * Wait for approval with timeout
     */
    async waitForApproval(task, timeoutMs = 24 * 60 * 60 * 1000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            // Check approval status
            const pending = this.approvalServer.getPending();
            const taskApproval = pending.find(p =>
                p.data?.title === task.title ||
                p.description?.includes(task.title)
            );

            if (!taskApproval) {
                // Task was approved or rejected (no longer pending)
                const all = this.approvalServer.loadApprovals();
                const processed = all.find(a =>
                    (a.data?.title === task.title || a.description?.includes(task.title)) &&
                    a.status !== 'pending'
                );

                if (processed) {
                    return processed.status === 'approved';
                }
            }

            // Wait before checking again
            await this.sleep(5000);
        }

        return false;
    }

    /**
     * Run the continuous empire loop via Orchestrator
     */
    async runEmpireLoop(config = {}) {
        this.isRunning = true;
        console.log('\n🏛️ EMPIRE MODE ACTIVATED');

        // Submit empire loop task to CEO module
        return this.orchestrator.submitTask({
            module: 'ceo',
            action: 'empire',
            description: 'Run continuous empire loop',
            data: config,
            impact: 10,
            urgency: 5
        });
    }

    /**
     * Implementation of Module.execute interface for the system module
     */
    async execute(task) {
        switch (task.action) {
            case 'stop':
                this.stop();
                return { success: true };
            case 'info':
                return {
                    version: '1.0.0',
                    mode: this.simulationMode ? 'simulation' : 'live'
                };
            default:
                throw new Error(`Unknown system action: ${task.action}`);
        }
    }

    /**
     * Handle approval callback
     */
    handleApproval(item) {
        console.log(`\n✅ Approved: ${item.taskType}`);
        this.auditLogger.logApproval(item.id, 'approved', item.notes || '');
    }

    /**
     * Handle rejection callback
     */
    handleRejection(item) {
        console.log(`\n❌ Rejected: ${item.taskType}`);
        this.auditLogger.logApproval(item.id, 'rejected', item.reason || '');
    }

    /**
     * Stop the empire
     */
    stop() {
        this.isRunning = false;
        this.approvalServer.stop();
        console.log('\n👑 Empire shutting down...');
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI Entry Point
async function main() {
    const args = process.argv.slice(2);

    const empire = new Empire();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        empire.stop();
        process.exit(0);
    });

    // Initialize
    const initialized = await empire.initialize();
    if (!initialized) {
        process.exit(1);
    }

    if (args.includes('--daemon') || args.includes('-d')) {
        // Continuous mode
        await empire.runEmpireLoop({
            loopInterval: 10 * 1000, // 10 seconds (Continuous Mode)
            ideasPerCycle: 5
        });
    } else if (args.length > 0 && !args[0].startsWith('-')) {
        // Single business from idea
        const idea = args.join(' ');
        await empire.runBusiness(idea);
        empire.stop();
    } else {
        // Interactive prompt
        console.log('Usage:');
        console.log('  node empire.js "Your business idea"    Run a single business');
        console.log('  node empire.js --daemon                Run continuous empire loop');
        console.log('');
        console.log('Example:');
        console.log('  node empire.js "AI-powered content writing service for small businesses"');
    }
}

main().catch(console.error);

export { Empire };
