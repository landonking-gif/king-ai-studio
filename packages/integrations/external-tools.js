/**
 * External Tools Connector - Interface to external apps and AI agents
 * Connects to: n8n, Browser Agents (Claude, Perplexity), Google Workspace, VS Code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AccountManager } from './account-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExternalToolsConnector {
    constructor(config = {}) {
        this.n8nUrl = config.n8nUrl || process.env.N8N_URL || 'http://localhost:5678';
        this.n8nApiKey = config.n8nApiKey || process.env.N8N_API_KEY;

        this.dataDir = config.dataDir || path.join(__dirname, '../../data/tools');
        this.ensureDataDir();

        // Initialize AccountManager for credential management
        this.accountManager = config.accountManager || new AccountManager(config);

        // Registry of available tools
        this.tools = {
            // Account management
            account_manager: {
                type: 'credential_management',
                description: 'Multi-account pool with rate-limit tracking and rotation',
                connected: true,
                capabilities: ['account_rotation', 'rate_limit_handling', 'credential_storage']
            },

            // Workflow automation
            n8n: {
                type: 'workflow',
                description: 'Workflow automation - email, scraping, integrations',
                connected: false,
                capabilities: ['email', 'scraping', 'webhooks', 'scheduling', 'integrations']
            },

            // Browser automation agents
            claude_browser: {
                type: 'browser_agent',
                description: 'Claude Sonnet browser controller for web tasks',
                connected: false,
                capabilities: ['web_browsing', 'form_filling', 'research', 'account_creation']
            },
            perplexity_comet: {
                type: 'browser_agent',
                description: 'Perplexity Comet for research and browsing',
                connected: false,
                capabilities: ['research', 'web_search', 'data_extraction']
            },

            // Google Workspace
            google_workspace: {
                type: 'productivity',
                description: 'Google Docs, Sheets, Gmail, Drive',
                connected: false,
                capabilities: ['documents', 'spreadsheets', 'email', 'storage', 'calendar']
            },

            // Development tools
            github_copilot: {
                type: 'coding',
                description: 'AI coding assistant in VS Code',
                connected: false,
                capabilities: ['code_generation', 'code_review', 'refactoring']
            },

            // Local AI
            ollama: {
                type: 'ai',
                description: 'Local AI models (DeepSeek, Llama)',
                connected: true,
                capabilities: ['reasoning', 'coding', 'analysis', 'planning']
            }
        };
    }


    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Trigger an n8n workflow
     */
    async triggerN8nWorkflow(webhookPath, data = {}) {
        try {
            const response = await fetch(`${this.n8nUrl}/webhook/${webhookPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`n8n error: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Create instruction file for browser agent
     * Browser agents will pick up tasks from this location
     */
    async createBrowserTask(agent, task) {
        const taskFile = path.join(this.dataDir, `${agent}-task.json`);
        const taskData = {
            id: `browser-task-${Date.now()}`,
            agent,
            task: task.description,
            steps: task.steps || [],
            url: task.url,
            expectedOutcome: task.expectedOutcome,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        fs.writeFileSync(taskFile, JSON.stringify(taskData, null, 2));

        return {
            success: true,
            taskId: taskData.id,
            taskFile,
            message: `Task created for ${agent}. The browser agent should pick this up.`
        };
    }

    /**
     * Create n8n workflow definition
     */
    async createN8nWorkflow(spec) {
        const workflow = {
            name: spec.name,
            nodes: [],
            connections: {},
            settings: { executionOrder: 'v1' }
        };

        // Map common operations to n8n nodes
        for (const step of spec.steps) {
            const node = this.mapToN8nNode(step);
            if (node) {
                workflow.nodes.push(node);
            }
        }

        // Save workflow definition
        const workflowFile = path.join(this.dataDir, `n8n-workflow-${Date.now()}.json`);
        fs.writeFileSync(workflowFile, JSON.stringify(workflow, null, 2));

        return {
            success: true,
            workflowFile,
            workflow,
            message: 'Import this workflow into n8n or trigger via webhook'
        };
    }

    /**
     * Map a step to n8n node
     */
    mapToN8nNode(step) {
        const nodeTemplates = {
            email: {
                type: 'n8n-nodes-base.gmail',
                name: step.name,
                parameters: {
                    operation: 'send',
                    to: '={{ $json.email }}',
                    subject: step.subject,
                    body: step.body
                }
            },
            scrape: {
                type: 'n8n-nodes-base.httpRequest',
                name: step.name,
                parameters: {
                    method: 'GET',
                    url: step.url
                }
            },
            webhook: {
                type: 'n8n-nodes-base.webhook',
                name: step.name,
                parameters: {
                    path: step.path,
                    method: 'POST'
                }
            },
            spreadsheet: {
                type: 'n8n-nodes-base.googleSheets',
                name: step.name,
                parameters: {
                    operation: step.operation || 'append',
                    sheetId: step.sheetId
                }
            }
        };

        return nodeTemplates[step.type] || null;
    }

    /**
     * Generate comprehensive task plan for external execution
     */
    async planExternalExecution(goal) {
        // This creates a structured plan that can be executed by various tools
        const plan = {
            id: `plan-${Date.now()}`,
            goal: goal.description,
            createdAt: new Date().toISOString(),
            phases: []
        };

        // Analyze goal and create phases
        const phases = this.decomposeGoal(goal);
        plan.phases = phases;

        // Save plan
        const planFile = path.join(this.dataDir, `execution-plan-${plan.id}.json`);
        fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));

        return { success: true, plan, planFile };
    }

    /**
     * Decompose a goal into phases with tool assignments
     */
    decomposeGoal(goal) {
        // Default phase structure for business goals
        return [
            {
                name: 'Research & Planning',
                tools: ['perplexity_comet', 'ollama'],
                tasks: [
                    { action: 'market_research', tool: 'perplexity_comet' },
                    { action: 'competitor_analysis', tool: 'perplexity_comet' },
                    { action: 'business_plan', tool: 'ollama' }
                ]
            },
            {
                name: 'Infrastructure Setup',
                tools: ['github_copilot', 'n8n'],
                tasks: [
                    { action: 'create_website', tool: 'github_copilot' },
                    { action: 'setup_workflows', tool: 'n8n' },
                    { action: 'configure_automation', tool: 'n8n' }
                ]
            },
            {
                name: 'Brand & Marketing',
                tools: ['claude_browser', 'ollama'],
                tasks: [
                    { action: 'create_brand_assets', tool: 'ollama' },
                    { action: 'setup_social_accounts', tool: 'claude_browser' },
                    { action: 'create_content_calendar', tool: 'ollama' }
                ]
            },
            {
                name: 'Lead Generation',
                tools: ['n8n', 'claude_browser'],
                tasks: [
                    { action: 'build_scraper', tool: 'n8n' },
                    { action: 'cold_email_campaign', tool: 'n8n' },
                    { action: 'outreach_automation', tool: 'n8n' }
                ]
            },
            {
                name: 'Client Operations',
                tools: ['google_workspace', 'n8n', 'ollama'],
                tasks: [
                    { action: 'contract_drafting', tool: 'ollama', requiresApproval: true },
                    { action: 'client_onboarding', tool: 'n8n' },
                    { action: 'project_management', tool: 'google_workspace' }
                ]
            }
        ];
    }

    /**
     * Get available tools
     */
    getTools() {
        return this.tools;
    }

    /**
     * Check tool connectivity
     */
    async checkConnections() {
        const status = {};

        // Check n8n
        try {
            const response = await fetch(`${this.n8nUrl}/healthz`);
            status.n8n = response.ok;
            this.tools.n8n.connected = response.ok;
        } catch {
            status.n8n = false;
        }

        // Check Ollama
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            status.ollama = response.ok;
            this.tools.ollama.connected = response.ok;
        } catch {
            status.ollama = false;
        }

        return status;
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'n8n_trigger':
                return this.triggerN8nWorkflow(task.data.webhook, task.data.payload);
            case 'browser_task':
                return this.createBrowserTask(task.data.agent, task.data.task);
            case 'create_workflow':
                return this.createN8nWorkflow(task.data);
            case 'plan':
                return this.planExternalExecution(task.data);
            case 'tools':
                return this.getTools();
            case 'check':
                return this.checkConnections();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ExternalToolsConnector;
