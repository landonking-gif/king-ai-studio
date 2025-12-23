/**
 * Self-Expansion Engine - The system that builds new modules
 * This is the meta-programming core of King AI Studio
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIProvider } from '../core/ai-provider.js';
import { AuditLogger } from '../core/audit-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SelfExpansionEngine {
    constructor(config = {}) {
        this.ai = config.aiProvider || new AIProvider(config);
        this.auditLogger = config.auditLogger || new AuditLogger();
        this.modulesDir = config.modulesDir || path.join(__dirname, '../modules');
        this.proposalsDir = config.proposalsDir || path.join(__dirname, '../../data/proposals');
        this.ensureDirectories();
        this.proposals = this.loadProposals();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.proposalsDir)) {
            fs.mkdirSync(this.proposalsDir, { recursive: true });
        }
    }

    loadProposals() {
        try {
            const proposalsFile = path.join(this.proposalsDir, 'proposals.json');
            if (fs.existsSync(proposalsFile)) {
                return JSON.parse(fs.readFileSync(proposalsFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load proposals:', error.message);
        }
        return [];
    }

    saveProposals() {
        const proposalsFile = path.join(this.proposalsDir, 'proposals.json');
        fs.writeFileSync(proposalsFile, JSON.stringify(this.proposals, null, 2));
    }

    /**
     * Analyze business needs and propose a new module
     */
    async proposeModule(need) {
        const prompt = `You are an AI system designer. Based on this business need, propose a new module:

Business Need: ${need.description}
Context: ${need.context || 'King Holdings business operations'}
Priority: ${need.priority || 'medium'}

Provide a JSON response with:
{
  "name": "ModuleName",
  "description": "What the module does",
  "category": "Category (compliance, finance, operations, etc)",
  "features": ["feature1", "feature2", ...],
  "dataStructures": ["What data it manages"],
  "integrations": ["What it connects to"],
  "methods": [
    {"name": "methodName", "description": "What it does", "parameters": ["param1"]}
  ],
  "estimatedComplexity": "low/medium/high",
  "businessValue": "Why this helps the business"
}

Return ONLY valid JSON.`;

        const result = await this.ai.complete(prompt, 'reasoning');

        if (result.success) {
            try {
                const proposal = JSON.parse(result.content);
                proposal.id = `proposal-${Date.now()}`;
                proposal.status = 'proposed';
                proposal.createdAt = new Date().toISOString();
                proposal.originalNeed = need;

                this.proposals.push(proposal);
                this.saveProposals();

                this.auditLogger.logSystem('module_proposed', {
                    proposalId: proposal.id,
                    moduleName: proposal.name,
                    need: need.description
                });

                return { success: true, proposal };
            } catch (parseError) {
                return { success: false, error: 'Failed to parse AI response', raw: result.content };
            }
        }

        return { success: false, error: result.error };
    }

    /**
     * Generate module code from an approved proposal
     */
    async buildModule(proposalId) {
        const proposal = this.proposals.find(p => p.id === proposalId);
        if (!proposal) {
            return { success: false, error: 'Proposal not found' };
        }

        if (proposal.status !== 'approved') {
            return { success: false, error: 'Proposal must be approved before building' };
        }

        const prompt = `Generate a complete JavaScript ES module for:

Module: ${proposal.name}
Description: ${proposal.description}

Features to implement:
${proposal.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Methods to implement:
${proposal.methods.map(m => `- ${m.name}(${m.parameters.join(', ')}): ${m.description}`).join('\n')}

Requirements:
1. Use ES modules (import/export)
2. Include JSDoc comments
3. Use a class-based structure similar to other modules
4. Include data persistence with JSON files
5. Include an execute(task) method for orchestrator integration
6. Handle errors gracefully
7. Make it production-ready

Return ONLY the complete JavaScript code.`;

        const result = await this.ai.complete(prompt, 'coding');

        if (result.success) {
            // Create module directory
            const moduleName = proposal.name.toLowerCase().replace(/\s+/g, '-');
            const moduleDir = path.join(this.modulesDir, moduleName);

            if (!fs.existsSync(moduleDir)) {
                fs.mkdirSync(moduleDir, { recursive: true });
            }

            // Write module file
            const modulePath = path.join(moduleDir, 'index.js');
            fs.writeFileSync(modulePath, result.content);

            // Update proposal status
            proposal.status = 'built';
            proposal.builtAt = new Date().toISOString();
            proposal.modulePath = modulePath;
            this.saveProposals();

            this.auditLogger.logSystem('module_built', {
                proposalId: proposal.id,
                moduleName: proposal.name,
                path: modulePath
            });

            return {
                success: true,
                modulePath,
                moduleName,
                proposal
            };
        }

        return { success: false, error: result.error };
    }

    /**
     * Approve a proposal
     */
    approveProposal(proposalId, notes = '') {
        const proposal = this.proposals.find(p => p.id === proposalId);
        if (!proposal) {
            return { success: false, error: 'Proposal not found' };
        }

        proposal.status = 'approved';
        proposal.approvedAt = new Date().toISOString();
        proposal.approvalNotes = notes;
        this.saveProposals();

        this.auditLogger.logSystem('proposal_approved', {
            proposalId: proposal.id,
            moduleName: proposal.name
        });

        return { success: true, proposal };
    }

    /**
     * Reject a proposal
     */
    rejectProposal(proposalId, reason) {
        const proposal = this.proposals.find(p => p.id === proposalId);
        if (!proposal) {
            return { success: false, error: 'Proposal not found' };
        }

        proposal.status = 'rejected';
        proposal.rejectedAt = new Date().toISOString();
        proposal.rejectionReason = reason;
        this.saveProposals();

        return { success: true, proposal };
    }

    /**
     * Get all proposals
     */
    getProposals(status = null) {
        if (status) {
            return this.proposals.filter(p => p.status === status);
        }
        return this.proposals;
    }

    /**
     * Analyze existing modules and suggest improvements
     */
    async analyzeForImprovements() {
        const modules = fs.readdirSync(this.modulesDir)
            .filter(f => fs.statSync(path.join(this.modulesDir, f)).isDirectory());

        const prompt = `Analyze these existing modules and suggest improvements or new modules:

Existing modules: ${modules.join(', ')}

Based on typical business needs for a holding company, suggest:
1. Missing capabilities in existing modules
2. New modules that would add value
3. Integration opportunities between modules

Return as JSON array of suggestions.`;

        const result = await this.ai.complete(prompt, 'reasoning');

        if (result.success) {
            try {
                return { success: true, suggestions: JSON.parse(result.content) };
            } catch {
                return { success: true, suggestions: result.content };
            }
        }

        return { success: false, error: result.error };
    }

    /**
     * Generate tests for a built module
     */
    async generateModuleTests(proposalId) {
        const proposal = this.proposals.find(p => p.id === proposalId);
        if (!proposal || !proposal.modulePath) {
            return { success: false, error: 'Built module not found' };
        }

        const moduleCode = fs.readFileSync(proposal.modulePath, 'utf-8');

        const prompt = `Generate comprehensive tests for this module:

\`\`\`javascript
${moduleCode}
\`\`\`

Requirements:
1. Use Node.js built-in test runner
2. Test all public methods
3. Include edge cases
4. Test error handling

Return ONLY the test code.`;

        const result = await this.ai.complete(prompt, 'coding');

        if (result.success) {
            const testPath = proposal.modulePath.replace('index.js', 'index.test.js');
            fs.writeFileSync(testPath, result.content);

            return { success: true, testPath };
        }

        return { success: false, error: result.error };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'propose':
                return this.proposeModule(task.data);
            case 'approve':
                return this.approveProposal(task.data.id, task.data.notes);
            case 'reject':
                return this.rejectProposal(task.data.id, task.data.reason);
            case 'build':
                return this.buildModule(task.data.id);
            case 'list':
                return this.getProposals(task.data?.status);
            case 'analyze':
                return this.analyzeForImprovements();
            case 'generate_tests':
                return this.generateModuleTests(task.data.id);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default SelfExpansionEngine;
