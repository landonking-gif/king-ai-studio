/**
 * Autonomous CEO - Enhanced version with multi-tool orchestration
 * Coordinates multiple AI agents and tools to build and run businesses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';
import { AuditLogger } from '../core/audit-logger.js';
import { BusinessAnalyzer } from './business-analyzer.js';
import { ExternalToolsConnector } from '../integrations/external-tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutonomousCEO {
    constructor(config = {}) {
        this.ai = config.aiProvider || config.modelRouter || new ModelRouter(config);
        this.auditLogger = config.auditLogger || new AuditLogger();
        this.businessAnalyzer = new BusinessAnalyzer(config);
        this.tools = new ExternalToolsConnector(config);

        this.recipientEmail = config.recipientEmail || process.env.NOTIFICATION_EMAIL;
        this.gmailUser = config.gmailUser || process.env.GMAIL_USER;
        this.gmailPassword = config.gmailPassword || process.env.GMAIL_APP_PASSWORD;

        this.dataDir = config.dataDir || path.join(__dirname, '../../data/ceo');
        this.ensureDataDir();

        this.activeBusiness = null;
        this.currentPhase = null;
        this.executionLog = [];
        this.pendingApprovals = [];
        this.isRunning = false;
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Log action and optionally send email
     */
    async log(message, type = 'info', sendEmail = false) {
        const entry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            phase: this.currentPhase,
            business: this.activeBusiness?.name
        };

        this.executionLog.push(entry);
        console.log(`[CEO ${type.toUpperCase()}] ${message}`);

        // Append to file
        const logFile = path.join(this.dataDir, 'execution.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

        // Send email for important updates
        if (sendEmail && this.recipientEmail) {
            await this.sendEmail(
                `[King AI CEO] ${type.toUpperCase()}: Update`,
                this.formatEmailBody(entry)
            );
        }

        this.auditLogger.logSystem('ceo_action', entry);
        return entry;
    }

    /**
     * Send email notification
     */
    async sendEmail(subject, body) {
        if (!this.gmailUser || !this.gmailPassword) {
            console.log('Email not configured, skipping notification');
            return;
        }

        // Use n8n or direct nodemailer
        try {
            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.default.createTransport({
                service: 'gmail',
                auth: {
                    user: this.gmailUser,
                    pass: this.gmailPassword
                }
            });

            await transporter.sendMail({
                from: this.gmailUser,
                to: this.recipientEmail,
                subject,
                html: body
            });

            return { success: true };
        } catch (error) {
            console.error('Email failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Format email body for updates
     */
    formatEmailBody(entry) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">King AI CEO Update</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <p><strong>Time:</strong> ${new Date(entry.timestamp).toLocaleString()}</p>
          <p><strong>Type:</strong> ${entry.type.toUpperCase()}</p>
          <p><strong>Phase:</strong> ${entry.phase || 'General'}</p>
          <p><strong>Business:</strong> ${entry.business || 'N/A'}</p>
          <hr>
          <p>${entry.message}</p>
        </div>
        <div style="padding: 10px; background: #1a1a2e; color: white; text-align: center;">
          <small>King AI Studio - Autonomous CEO</small>
        </div>
      </div>
    `;
    }

    /**
     * Request approval for sensitive actions
     */
    async requestApproval(decision) {
        const request = {
            id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            type: decision.type,
            title: decision.title,
            description: decision.description,
            amount: decision.amount,
            impact: decision.impact,
            recommendation: decision.recommendation,
            alternatives: decision.alternatives || [],
            phase: this.currentPhase,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.pendingApprovals.push(request);
        this.savePendingApprovals();

        // Send approval request email
        await this.sendEmail(
            `[APPROVAL REQUIRED] ${request.title}`,
            this.formatApprovalEmail(request)
        );

        await this.log(
            `🔒 APPROVAL NEEDED: ${request.title}\n` +
            `   Type: ${request.type}\n` +
            `   ${request.description}`,
            'approval_needed'
        );

        return request;
    }

    /**
     * Format approval request email
     */
    formatApprovalEmail(request) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #e74c3c; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">⚠️ Approval Required</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <h2>${request.title}</h2>
          <p><strong>Type:</strong> ${request.type}</p>
          <p><strong>Phase:</strong> ${request.phase || 'N/A'}</p>
          ${request.amount ? `<p><strong>Amount:</strong> $${request.amount}</p>` : ''}
          <hr>
          <h3>Description</h3>
          <p>${request.description}</p>
          <h3>Impact</h3>
          <p>${request.impact}</p>
          <h3>AI Recommendation</h3>
          <p>${request.recommendation}</p>
          ${request.alternatives.length > 0 ? `
            <h3>Alternatives Considered</h3>
            <ul>${request.alternatives.map(a => `<li>${a}</li>`).join('')}</ul>
          ` : ''}
          <hr>
          <p style="text-align: center;">
            <strong>To proceed, please use the approval buttons above or visit your dashboard.</strong><br>
            <small>(Replies to this email are not monitored by the AI)</small>
          </p>
        </div>
        <div style="padding: 10px; background: #1a1a2e; color: white; text-align: center;">
          <small>Approval ID: ${request.id}</small>
        </div>
      </div>
    `;
    }

    /**
     * Save pending approvals to file
     */
    savePendingApprovals() {
        const file = path.join(this.dataDir, 'pending-approvals.json');
        fs.writeFileSync(file, JSON.stringify(this.pendingApprovals, null, 2));
    }

    /**
     * Load pending approvals
     */
    loadPendingApprovals() {
        const file = path.join(this.dataDir, 'pending-approvals.json');
        if (fs.existsSync(file)) {
            this.pendingApprovals = JSON.parse(fs.readFileSync(file, 'utf-8'));
        }
    }

    /**
     * Start building a business from a blueprint
     */
    async startFromBlueprint(blueprint) {
        await this.log(`🚀 STARTING NEW BUSINESS: ${blueprint.name}`, 'start', true);

        this.activeBusiness = {
            id: `business-${Date.now()}`,
            name: blueprint.name,
            blueprint: blueprint,
            status: 'initializing',
            startedAt: new Date().toISOString(),
            completedPhases: [],
            currentTasks: []
        };

        this.saveState();

        // Phase 1: Foundation
        await this.executePhase('foundation', blueprint.foundation);

        return {
            success: true,
            business: this.activeBusiness,
            message: 'Business initialization started. Check email for approval requests.'
        };
    }

    /**
     * Execute a phase of the business plan
     */
    async executePhase(phaseName, phaseData) {
        this.currentPhase = phaseName;
        await this.log(`📋 Starting Phase: ${phaseName}`, 'phase_start', true);

        // Execute each section of the phase
        for (const [sectionName, sectionData] of Object.entries(phaseData)) {
            await this.log(`   → Section: ${sectionName}`, 'section');

            if (sectionData.tasks) {
                for (const task of sectionData.tasks) {
                    await this.executeTask(task);
                }
            } else if (Array.isArray(sectionData)) {
                for (const item of sectionData) {
                    if (item.task) {
                        await this.executeTask(item);
                    }
                }
            }
        }

        this.activeBusiness.completedPhases.push(phaseName);
        await this.log(`✅ Phase Complete: ${phaseName}`, 'phase_complete', true);
        this.saveState();
    }

    /**
     * Execute a single task
     */
    async executeTask(task) {
        // Check if approval needed
        if (task.requiresApproval) {
            await this.requestApproval({
                type: task.type || 'general',
                title: task.task,
                description: `Task in phase: ${this.currentPhase}`,
                impact: `Using tool: ${task.tool}`,
                recommendation: 'AI recommends proceeding with this task'
            });

            await this.log(`⏸️  Paused for approval: ${task.task}`, 'awaiting_approval');
            return { status: 'awaiting_approval', task: task.task };
        }

        // Execute based on tool
        await this.log(`🔧 Executing: ${task.task} (${task.tool})`, 'task');

        switch (task.tool) {
            case 'ollama':
                return this.executeWithOllama(task);
            case 'n8n':
                return this.executeWithN8n(task);
            case 'claude_browser':
            case 'perplexity_comet':
                return this.executeWithBrowserAgent(task);
            case 'google_workspace':
                return this.executeWithGoogleWorkspace(task);
            case 'github_copilot':
                return this.executeWithCopilot(task);
            default:
                await this.log(`   ℹ️  Manual task: ${task.task}`, 'manual');
                return { status: 'manual_required', task: task.task };
        }
    }

    /**
     * Execute task with Ollama (local AI)
     */
    async executeWithOllama(task) {
        const prompt = `Execute this business task and provide the output:
Task: ${task.task}
Context: ${this.activeBusiness?.name || 'Business setup'}

Provide a detailed, actionable response.`;

        const result = await this.ai.complete(prompt, 'reasoning');

        if (result.success) {
            await this.log(`   ✓ Ollama completed: ${task.task.substring(0, 50)}...`, 'success');

            // Save output
            const outputFile = path.join(this.dataDir, `output-${Date.now()}.json`);
            fs.writeFileSync(outputFile, JSON.stringify({
                task: task.task,
                output: result.content,
                timestamp: new Date().toISOString()
            }, null, 2));

            return { success: true, output: result.content };
        }

        return { success: false, error: result.error };
    }

    /**
     * Execute task with n8n workflow
     */
    async executeWithN8n(task) {
        // Create workflow specification
        const workflow = await this.tools.createN8nWorkflow({
            name: task.task,
            steps: task.steps || [{ type: 'webhook', name: task.task }]
        });

        await this.log(`   ✓ n8n workflow created: ${workflow.workflowFile}`, 'success');
        return workflow;
    }

    /**
     * Execute task with browser agent
     */
    async executeWithBrowserAgent(task) {
        const browserTask = await this.tools.createBrowserTask(task.tool, {
            description: task.task,
            steps: task.steps || [],
            expectedOutcome: task.expectedOutcome || 'Complete the task'
        });

        await this.log(`   ✓ Browser task created for ${task.tool}`, 'success');
        return browserTask;
    }

    /**
     * Execute task with Google Workspace
     */
    async executeWithGoogleWorkspace(task) {
        // Generate document content with AI
        const content = await this.ai.complete(
            `Create content for: ${task.task}`,
            'reasoning'
        );

        await this.log(`   ✓ Google Workspace content generated`, 'success');
        return { success: true, content: content.content };
    }

    /**
     * Execute task with GitHub Copilot
     */
    async executeWithCopilot(task) {
        // Generate code specification
        const code = await this.ai.complete(
            `Generate code for: ${task.task}`,
            'coding'
        );

        await this.log(`   ✓ Code generated for Copilot integration`, 'success');
        return { success: true, code: code.content };
    }

    /**
     * Save current state
     */
    saveState() {
        const stateFile = path.join(this.dataDir, 'state.json');
        fs.writeFileSync(stateFile, JSON.stringify({
            activeBusiness: this.activeBusiness,
            currentPhase: this.currentPhase,
            pendingApprovals: this.pendingApprovals.length,
            lastUpdated: new Date().toISOString()
        }, null, 2));
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeBusiness: this.activeBusiness,
            currentPhase: this.currentPhase,
            pendingApprovals: this.pendingApprovals.filter(a => a.status === 'pending'),
            recentLog: this.executionLog.slice(-10),
            availableTools: Object.keys(this.tools.tools)
        };
    }

    /**
     * Approve a pending request
     */
    approve(approvalId, notes = '') {
        const approval = this.pendingApprovals.find(a => a.id === approvalId);
        if (!approval) return { success: false, error: 'Not found' };

        approval.status = 'approved';
        approval.approvedAt = new Date().toISOString();
        approval.notes = notes;
        this.savePendingApprovals();

        this.log(`✅ Approved: ${approval.title}`, 'approved', true);
        return { success: true, approval };
    }

    /**
     * Reject a pending request
     */
    reject(approvalId, reason) {
        const approval = this.pendingApprovals.find(a => a.id === approvalId);
        if (!approval) return { success: false, error: 'Not found' };

        approval.status = 'rejected';
        approval.rejectedAt = new Date().toISOString();
        approval.rejectionReason = reason;
        this.savePendingApprovals();

        this.log(`❌ Rejected: ${approval.title} - ${reason}`, 'rejected', true);
        return { success: true, approval };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'start_blueprint':
                const blueprint = (await import(`../blueprints/${task.data.blueprint}.js`)).default;
                return this.startFromBlueprint(blueprint);
            case 'start_idea':
                const analysis = await this.businessAnalyzer.analyzeIdea(task.data);
                if (analysis.success) {
                    return this.startFromAnalysis(analysis.analysis);
                }
                return analysis;
            case 'status':
                return this.getStatus();
            case 'approve':
                return this.approve(task.data.id, task.data.notes);
            case 'reject':
                return this.reject(task.data.id, task.data.reason);
            case 'continue':
                return this.continueExecution();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default AutonomousCEO;
