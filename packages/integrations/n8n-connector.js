/**
 * n8n Connector - Full integration with n8n workflow automation
 * Supports workflow import, webhook creation, and execution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class N8nConnector {
    constructor(config = {}) {
        this.baseUrl = config.n8nUrl || process.env.N8N_URL || 'http://localhost:5678';
        this.apiKey = config.n8nApiKey || process.env.N8N_API_KEY;
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/n8n');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Get headers for API requests
     */
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            headers['X-N8N-API-KEY'] = this.apiKey;
        }
        return headers;
    }

    /**
     * Check if n8n is available
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
                headers: this.getHeaders()
            });
            return { connected: response.ok, status: response.status };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }

    /**
     * List all workflows
     */
    async listWorkflows() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, workflows: data.data || data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a specific workflow
     */
    async getWorkflow(workflowId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, workflow: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Create/Import a workflow
     */
    async createWorkflow(workflow) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(workflow)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            // Save locally
            const localPath = path.join(this.dataDir, `workflow-${data.id}.json`);
            fs.writeFileSync(localPath, JSON.stringify(data, null, 2));

            return { success: true, workflow: data, localPath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a workflow
     */
    async updateWorkflow(workflowId, workflow) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(workflow)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, workflow: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Activate a workflow
     */
    async activateWorkflow(workflowId) {
        return this.updateWorkflow(workflowId, { active: true });
    }

    /**
     * Deactivate a workflow
     */
    async deactivateWorkflow(workflowId) {
        return this.updateWorkflow(workflowId, { active: false });
    }

    /**
     * Delete a workflow
     */
    async deleteWorkflow(workflowId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute a workflow (via webhook or direct)
     */
    async executeWorkflow(workflowId, payload = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, execution: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Trigger a webhook
     */
    async triggerWebhook(webhookPath, payload = {}, method = 'POST') {
        try {
            const response = await fetch(`${this.baseUrl}/webhook/${webhookPath}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: method !== 'GET' ? JSON.stringify(payload) : undefined
            });

            const data = await response.json().catch(() => ({}));
            return { success: response.ok, data, status: response.status };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a webhook workflow from template
     */
    async createWebhookWorkflow(config) {
        const workflow = {
            name: config.name || `Webhook-${Date.now()}`,
            active: config.active !== false,
            nodes: [
                {
                    id: 'webhook-1',
                    name: 'Webhook',
                    type: 'n8n-nodes-base.webhook',
                    position: [250, 300],
                    parameters: {
                        path: config.path || `hook-${Date.now()}`,
                        httpMethod: config.method || 'POST',
                        responseMode: 'onReceived',
                        responseData: 'allEntries'
                    },
                    typeVersion: 1
                },
                ...this.buildNodes(config.actions || [], 400)
            ],
            connections: this.buildConnections(config.actions?.length || 0)
        };

        return this.createWorkflow(workflow);
    }

    /**
     * Build nodes from action specifications
     */
    buildNodes(actions, startX) {
        return actions.map((action, index) => {
            const nodeId = `node-${index + 2}`;
            const position = [startX + (index * 200), 300];

            switch (action.type) {
                case 'http':
                    return {
                        id: nodeId,
                        name: action.name || 'HTTP Request',
                        type: 'n8n-nodes-base.httpRequest',
                        position,
                        parameters: {
                            method: action.method || 'POST',
                            url: action.url,
                            options: {}
                        },
                        typeVersion: 1
                    };

                case 'email':
                    return {
                        id: nodeId,
                        name: action.name || 'Send Email',
                        type: 'n8n-nodes-base.gmail',
                        position,
                        parameters: {
                            operation: 'send',
                            sendTo: action.to || '={{ $json.email }}',
                            subject: action.subject,
                            message: action.body
                        },
                        typeVersion: 1
                    };

                case 'slack':
                    return {
                        id: nodeId,
                        name: action.name || 'Slack Message',
                        type: 'n8n-nodes-base.slack',
                        position,
                        parameters: {
                            operation: 'post',
                            channel: action.channel,
                            text: action.message
                        },
                        typeVersion: 1
                    };

                case 'spreadsheet':
                    return {
                        id: nodeId,
                        name: action.name || 'Google Sheets',
                        type: 'n8n-nodes-base.googleSheets',
                        position,
                        parameters: {
                            operation: action.operation || 'append',
                            sheetId: action.sheetId,
                            range: action.range
                        },
                        typeVersion: 1
                    };

                case 'code':
                    return {
                        id: nodeId,
                        name: action.name || 'Code',
                        type: 'n8n-nodes-base.code',
                        position,
                        parameters: {
                            jsCode: action.code
                        },
                        typeVersion: 1
                    };

                default:
                    return {
                        id: nodeId,
                        name: action.name || 'Set',
                        type: 'n8n-nodes-base.set',
                        position,
                        parameters: {
                            values: { string: action.values || [] }
                        },
                        typeVersion: 1
                    };
            }
        });
    }

    /**
     * Build connections between nodes
     */
    buildConnections(actionCount) {
        const connections = { 'Webhook': { main: [[]] } };

        if (actionCount > 0) {
            connections['Webhook'].main[0].push({ node: 'node-2', type: 'main', index: 0 });
        }

        for (let i = 2; i <= actionCount; i++) {
            connections[`node-${i}`] = {
                main: [[{ node: `node-${i + 1}`, type: 'main', index: 0 }]]
            };
        }

        return connections;
    }

    /**
     * Create common workflow templates
     */
    async createTemplate(templateName, config = {}) {
        const templates = {
            // Lead capture webhook
            'lead-capture': {
                name: config.name || 'Lead Capture',
                path: config.path || 'lead-capture',
                actions: [
                    { type: 'spreadsheet', name: 'Save to Sheet', sheetId: config.sheetId, operation: 'append' },
                    { type: 'email', name: 'Notify Team', subject: 'New Lead!', body: '={{ $json }}' }
                ]
            },

            // Daily report
            'daily-report': {
                name: config.name || 'Daily Report',
                path: config.path || 'daily-report',
                actions: [
                    { type: 'code', name: 'Generate Report', code: 'return [{ json: { report: "Daily summary" } }]' },
                    { type: 'email', name: 'Send Report', subject: 'Daily Report', body: '={{ $json.report }}' }
                ]
            },

            // Social media post
            'social-post': {
                name: config.name || 'Social Media Post',
                path: config.path || 'social-post',
                actions: [
                    { type: 'http', name: 'Post to Twitter', method: 'POST', url: 'https://api.twitter.com/2/tweets' },
                    { type: 'http', name: 'Post to LinkedIn', method: 'POST', url: 'https://api.linkedin.com/v2/shares' }
                ]
            }
        };

        const template = templates[templateName];
        if (!template) {
            return { success: false, error: `Unknown template: ${templateName}` };
        }

        return this.createWebhookWorkflow(template);
    }

    /**
     * Import workflow from file
     */
    async importFromFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const workflow = JSON.parse(content);
            return this.createWorkflow(workflow);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Export workflow to file
     */
    async exportToFile(workflowId, filePath) {
        const result = await this.getWorkflow(workflowId);
        if (!result.success) return result;

        try {
            fs.writeFileSync(filePath, JSON.stringify(result.workflow, null, 2));
            return { success: true, path: filePath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'check':
                return this.checkConnection();
            case 'list':
                return this.listWorkflows();
            case 'get':
                return this.getWorkflow(task.data.id);
            case 'create':
                return this.createWorkflow(task.data.workflow);
            case 'update':
                return this.updateWorkflow(task.data.id, task.data.workflow);
            case 'activate':
                return this.activateWorkflow(task.data.id);
            case 'deactivate':
                return this.deactivateWorkflow(task.data.id);
            case 'delete':
                return this.deleteWorkflow(task.data.id);
            case 'execute':
                return this.executeWorkflow(task.data.id, task.data.payload);
            case 'webhook':
                return this.triggerWebhook(task.data.path, task.data.payload);
            case 'create_webhook':
                return this.createWebhookWorkflow(task.data);
            case 'template':
                return this.createTemplate(task.data.template, task.data.config);
            case 'import':
                return this.importFromFile(task.data.path);
            case 'export':
                return this.exportToFile(task.data.id, task.data.path);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default N8nConnector;
