/**
 * Client Manager - CRM functionality for managing clients
 * Handles client communication, contracts, and proposals
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIProvider } from '../core/ai-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ClientManager {
    constructor(config = {}) {
        this.ai = config.aiProvider || new AIProvider(config);
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/clients');
        this.templatesDir = path.join(this.dataDir, 'templates');
        this.ensureDirectories();
        this.loadClients();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.templatesDir)) {
            fs.mkdirSync(this.templatesDir, { recursive: true });
        }
    }

    /**
     * Load clients from storage
     */
    loadClients() {
        const clientsFile = path.join(this.dataDir, 'clients.json');
        if (fs.existsSync(clientsFile)) {
            this.clients = JSON.parse(fs.readFileSync(clientsFile, 'utf-8'));
        } else {
            this.clients = [];
        }
    }

    /**
     * Save clients to storage
     */
    saveClients() {
        const clientsFile = path.join(this.dataDir, 'clients.json');
        fs.writeFileSync(clientsFile, JSON.stringify(this.clients, null, 2));
    }

    /**
     * Add a new client
     */
    addClient(data) {
        const client = {
            id: `client-${Date.now()}`,
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            company: data.company || '',
            industry: data.industry || '',
            status: 'lead', // lead, prospect, active, churned
            source: data.source || 'direct',
            notes: data.notes || '',
            tags: data.tags || [],
            createdAt: new Date().toISOString(),
            communications: [],
            contracts: [],
            proposals: []
        };

        this.clients.push(client);
        this.saveClients();

        console.log(`[ClientManager] Added client: ${client.name}`);

        return { success: true, client };
    }

    /**
     * Update client
     */
    updateClient(clientId, updates) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        Object.assign(client, updates, { updatedAt: new Date().toISOString() });
        this.saveClients();

        return { success: true, client };
    }

    /**
     * Get client by ID
     */
    getClient(clientId) {
        return this.clients.find(c => c.id === clientId);
    }

    /**
     * Search clients
     */
    searchClients(query) {
        const q = query.toLowerCase();
        return this.clients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.company?.toLowerCase().includes(q)
        );
    }

    /**
     * Get clients by status
     */
    getClientsByStatus(status) {
        return this.clients.filter(c => c.status === status);
    }

    /**
     * Log communication with client
     */
    logCommunication(clientId, data) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        const communication = {
            id: `comm-${Date.now()}`,
            type: data.type, // email, call, meeting, message
            direction: data.direction || 'outbound', // inbound, outbound
            subject: data.subject,
            content: data.content,
            timestamp: new Date().toISOString(),
            followUpDate: data.followUpDate || null
        };

        client.communications.push(communication);
        this.saveClients();

        return { success: true, communication };
    }

    /**
     * Generate email reply using AI
     */
    async generateEmailReply(clientId, incomingEmail, context = '') {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        const prompt = `You are a professional business assistant. Generate a professional email reply.

CLIENT INFO:
- Name: ${client.name}
- Company: ${client.company}
- Status: ${client.status}
- Previous communications: ${client.communications.length}

INCOMING EMAIL:
Subject: ${incomingEmail.subject}
From: ${incomingEmail.from}
Body:
${incomingEmail.body}

CONTEXT/INSTRUCTIONS:
${context || 'Reply professionally and helpfully.'}

Generate a professional email reply. Include:
1. Appropriate greeting
2. Address their questions/concerns
3. Professional closing

Return ONLY the email body, no subject line.`;

        const result = await this.ai.complete(prompt, 'fast');

        if (result.success) {
            // Log as outbound communication
            await this.logCommunication(clientId, {
                type: 'email',
                direction: 'outbound',
                subject: `Re: ${incomingEmail.subject}`,
                content: result.content
            });

            return { success: true, reply: result.content };
        }

        return { success: false, error: result.error };
    }

    /**
     * Generate proposal using AI
     */
    async generateProposal(clientId, projectDetails) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        const prompt = `Generate a professional business proposal.

CLIENT:
- Name: ${client.name}
- Company: ${client.company}
- Industry: ${client.industry}

PROJECT DETAILS:
${JSON.stringify(projectDetails, null, 2)}

Generate a complete proposal with:
1. Executive Summary
2. Project Scope
3. Deliverables
4. Timeline
5. Pricing (use the provided budget or estimate)
6. Terms and Conditions
7. Next Steps

Format as professional markdown.`;

        const result = await this.ai.complete(prompt, 'reasoning');

        if (result.success) {
            const proposal = {
                id: `proposal-${Date.now()}`,
                clientId,
                projectDetails,
                content: result.content,
                status: 'draft',
                createdAt: new Date().toISOString()
            };

            // Save proposal
            const proposalPath = path.join(this.dataDir, `${proposal.id}.md`);
            fs.writeFileSync(proposalPath, result.content);

            client.proposals.push({
                id: proposal.id,
                title: projectDetails.title || 'Untitled Proposal',
                status: 'draft',
                createdAt: proposal.createdAt,
                path: proposalPath
            });
            this.saveClients();

            return { success: true, proposal, path: proposalPath };
        }

        return { success: false, error: result.error };
    }

    /**
     * Generate contract using AI (REQUIRES LEGAL APPROVAL)
     */
    async generateContract(clientId, contractDetails) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        const prompt = `Generate a professional service contract.

PARTIES:
- Provider: King Holdings
- Client: ${client.name} (${client.company || 'Individual'})

CONTRACT DETAILS:
${JSON.stringify(contractDetails, null, 2)}

Generate a complete contract with:
1. Parties and Definitions
2. Scope of Services
3. Payment Terms
4. Timeline and Milestones
5. Intellectual Property Rights
6. Confidentiality
7. Termination Clause
8. Limitation of Liability
9. Dispute Resolution
10. Signatures Section

IMPORTANT: This is a DRAFT and requires legal review before use.

Format as professional markdown with clear sections.`;

        const result = await this.ai.complete(prompt, 'reasoning');

        if (result.success) {
            const contract = {
                id: `contract-${Date.now()}`,
                clientId,
                details: contractDetails,
                content: result.content,
                status: 'draft_pending_legal_review', // Always needs approval
                createdAt: new Date().toISOString()
            };

            // Save contract
            const contractPath = path.join(this.dataDir, `${contract.id}.md`);

            // Add legal warning header
            const contentWithWarning = `> ⚠️ **DRAFT CONTRACT - REQUIRES LEGAL REVIEW**
> This contract was AI-generated and must be reviewed by legal counsel before use.
> Status: ${contract.status}

---

${result.content}`;

            fs.writeFileSync(contractPath, contentWithWarning);

            client.contracts.push({
                id: contract.id,
                title: contractDetails.title || 'Service Agreement',
                status: 'draft_pending_legal_review',
                createdAt: contract.createdAt,
                path: contractPath
            });
            this.saveClients();

            return {
                success: true,
                contract,
                path: contractPath,
                requiresApproval: true,
                warning: 'Contract requires legal review before sending to client'
            };
        }

        return { success: false, error: result.error };
    }

    /**
     * Send email to client (stub - needs email integration)
     */
    async sendEmail(clientId, email) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        // Log the email
        await this.logCommunication(clientId, {
            type: 'email',
            direction: 'outbound',
            subject: email.subject,
            content: email.body
        });

        // In production, this would integrate with EmailNotifier
        console.log(`[ClientManager] Email to ${client.email}:`, email.subject);

        return {
            success: true,
            message: 'Email logged. Integrate with EmailNotifier for actual sending.',
            to: client.email,
            subject: email.subject
        };
    }

    /**
     * Get client summary/report
     */
    getSummary() {
        const summary = {
            total: this.clients.length,
            byStatus: {
                lead: this.clients.filter(c => c.status === 'lead').length,
                prospect: this.clients.filter(c => c.status === 'prospect').length,
                active: this.clients.filter(c => c.status === 'active').length,
                churned: this.clients.filter(c => c.status === 'churned').length
            },
            recentClients: this.clients
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map(c => ({ id: c.id, name: c.name, status: c.status })),
            pendingFollowUps: []
        };

        // Find pending follow-ups
        for (const client of this.clients) {
            for (const comm of client.communications) {
                if (comm.followUpDate && new Date(comm.followUpDate) <= new Date()) {
                    summary.pendingFollowUps.push({
                        clientId: client.id,
                        clientName: client.name,
                        followUpDate: comm.followUpDate,
                        subject: comm.subject
                    });
                }
            }
        }

        return summary;
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'add':
                return this.addClient(task.data);
            case 'update':
                return this.updateClient(task.data.id, task.data.updates);
            case 'get':
                return this.getClient(task.data.id);
            case 'search':
                return this.searchClients(task.data.query);
            case 'list':
                return task.data?.status ? this.getClientsByStatus(task.data.status) : this.clients;
            case 'log_communication':
                return this.logCommunication(task.data.clientId, task.data);
            case 'generate_reply':
                return this.generateEmailReply(task.data.clientId, task.data.email, task.data.context);
            case 'generate_proposal':
                return this.generateProposal(task.data.clientId, task.data.project);
            case 'generate_contract':
                return this.generateContract(task.data.clientId, task.data.contract);
            case 'send_email':
                return this.sendEmail(task.data.clientId, task.data.email);
            case 'summary':
                return this.getSummary();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ClientManager;
