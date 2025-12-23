/**
 * Contracts & AR Module - Template management, status tracking, receivables
 * Handles contract lifecycle and accounts receivable management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ContractsModule {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../../data/contracts');
        this.contractsFile = path.join(this.dataDir, 'contracts.json');
        this.templatesFile = path.join(this.dataDir, 'templates.json');
        this.receivablesFile = path.join(this.dataDir, 'receivables.json');
        this.ensureDataDir();
        this.contracts = this.loadContracts();
        this.templates = this.loadTemplates();
        this.receivables = this.loadReceivables();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        // Templates subdirectory
        const templatesDir = path.join(this.dataDir, 'templates');
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
        }
    }

    loadContracts() {
        try {
            if (fs.existsSync(this.contractsFile)) {
                return JSON.parse(fs.readFileSync(this.contractsFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load contracts:', error.message);
        }
        return [];
    }

    loadTemplates() {
        try {
            if (fs.existsSync(this.templatesFile)) {
                return JSON.parse(fs.readFileSync(this.templatesFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load templates:', error.message);
        }
        return [];
    }

    loadReceivables() {
        try {
            if (fs.existsSync(this.receivablesFile)) {
                return JSON.parse(fs.readFileSync(this.receivablesFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load receivables:', error.message);
        }
        return [];
    }

    saveContracts() {
        fs.writeFileSync(this.contractsFile, JSON.stringify(this.contracts, null, 2));
    }

    saveTemplates() {
        fs.writeFileSync(this.templatesFile, JSON.stringify(this.templates, null, 2));
    }

    saveReceivables() {
        fs.writeFileSync(this.receivablesFile, JSON.stringify(this.receivables, null, 2));
    }

    // ==================== CONTRACTS ====================

    /**
     * Add a new contract
     */
    addContract(contract) {
        const id = contract.id || `contract-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const newContract = {
            id,
            name: contract.name,
            counterparty: contract.counterparty,
            type: contract.type || 'service', // service, lease, loan, other
            value: contract.value || 0,
            currency: contract.currency || 'USD',
            startDate: contract.startDate,
            endDate: contract.endDate,
            renewalType: contract.renewalType || 'none', // auto, manual, none
            status: contract.status || 'draft', // draft, pending, active, expired, terminated
            documents: contract.documents || [],
            terms: contract.terms || '',
            notes: contract.notes || '',
            entity: contract.entity || 'King Holdings',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.contracts.push(newContract);
        this.saveContracts();
        return newContract;
    }

    /**
     * Update contract status
     */
    updateContractStatus(contractId, status, notes = '') {
        const contract = this.contracts.find(c => c.id === contractId);
        if (!contract) {
            return { success: false, error: 'Contract not found' };
        }

        contract.status = status;
        contract.updatedAt = new Date().toISOString();
        if (notes) {
            contract.notes = contract.notes ? `${contract.notes}\n\n${notes}` : notes;
        }

        this.saveContracts();
        return { success: true, contract };
    }

    /**
     * Get contracts by status
     */
    getContractsByStatus(status) {
        return this.contracts.filter(c => c.status === status);
    }

    /**
     * Get expiring contracts
     */
    getExpiringContracts(days = 90) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return this.contracts
            .filter(c => {
                if (c.status !== 'active' || !c.endDate) return false;
                const endDate = new Date(c.endDate);
                return endDate >= now && endDate <= futureDate;
            })
            .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
    }

    // ==================== TEMPLATES ====================

    /**
     * Add a contract template
     */
    addTemplate(template) {
        const id = template.id || `template-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const newTemplate = {
            id,
            name: template.name,
            type: template.type || 'service',
            description: template.description || '',
            content: template.content || '',
            variables: template.variables || [], // e.g., ['{{counterparty}}', '{{value}}']
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save template content to file
        const templatePath = path.join(this.dataDir, 'templates', `${id}.txt`);
        if (template.content) {
            fs.writeFileSync(templatePath, template.content);
        }

        this.templates.push(newTemplate);
        this.saveTemplates();
        return newTemplate;
    }

    /**
     * Generate contract from template
     */
    generateFromTemplate(templateId, variables = {}) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            return { success: false, error: 'Template not found' };
        }

        // Load template content
        const templatePath = path.join(this.dataDir, 'templates', `${templateId}.txt`);
        let content = template.content;
        if (fs.existsSync(templatePath)) {
            content = fs.readFileSync(templatePath, 'utf-8');
        }

        // Replace variables
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        return {
            success: true,
            content,
            unresolvedVariables: (content.match(/{{[^}]+}}/g) || [])
        };
    }

    // ==================== RECEIVABLES ====================

    /**
     * Add a receivable (invoice)
     */
    addReceivable(receivable) {
        const id = receivable.id || `ar-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const newReceivable = {
            id,
            contractId: receivable.contractId || null,
            invoiceNumber: receivable.invoiceNumber || id,
            counterparty: receivable.counterparty,
            description: receivable.description || '',
            amount: receivable.amount,
            currency: receivable.currency || 'USD',
            issueDate: receivable.issueDate || new Date().toISOString().split('T')[0],
            dueDate: receivable.dueDate,
            status: 'pending', // pending, paid, overdue, disputed, written-off
            payments: [], // Track partial payments
            notes: receivable.notes || '',
            entity: receivable.entity || 'King Holdings',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.receivables.push(newReceivable);
        this.saveReceivables();
        return newReceivable;
    }

    /**
     * Record a payment
     */
    recordPayment(receivableId, payment) {
        const receivable = this.receivables.find(r => r.id === receivableId);
        if (!receivable) {
            return { success: false, error: 'Receivable not found' };
        }

        const paymentRecord = {
            id: `pay-${Date.now()}`,
            amount: payment.amount,
            date: payment.date || new Date().toISOString().split('T')[0],
            method: payment.method || 'unknown',
            reference: payment.reference || '',
            recordedAt: new Date().toISOString()
        };

        receivable.payments.push(paymentRecord);
        receivable.updatedAt = new Date().toISOString();

        // Calculate total paid
        const totalPaid = receivable.payments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= receivable.amount) {
            receivable.status = 'paid';
            receivable.paidDate = new Date().toISOString();
        }

        this.saveReceivables();
        return {
            success: true,
            receivable,
            totalPaid,
            remaining: receivable.amount - totalPaid
        };
    }

    /**
     * Get aging report
     */
    getAgingReport() {
        const now = new Date();
        const buckets = {
            current: { count: 0, amount: 0, items: [] },
            '1-30': { count: 0, amount: 0, items: [] },
            '31-60': { count: 0, amount: 0, items: [] },
            '61-90': { count: 0, amount: 0, items: [] },
            '90+': { count: 0, amount: 0, items: [] }
        };

        for (const r of this.receivables) {
            if (r.status === 'paid') continue;

            const dueDate = new Date(r.dueDate);
            const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
            const remaining = r.amount - r.payments.reduce((sum, p) => sum + p.amount, 0);

            let bucket;
            if (daysOverdue <= 0) bucket = 'current';
            else if (daysOverdue <= 30) bucket = '1-30';
            else if (daysOverdue <= 60) bucket = '31-60';
            else if (daysOverdue <= 90) bucket = '61-90';
            else bucket = '90+';

            buckets[bucket].count++;
            buckets[bucket].amount += remaining;
            buckets[bucket].items.push({
                id: r.id,
                counterparty: r.counterparty,
                amount: remaining,
                dueDate: r.dueDate,
                daysOverdue: daysOverdue > 0 ? daysOverdue : 0
            });

            // Update status if overdue
            if (daysOverdue > 0 && r.status === 'pending') {
                r.status = 'overdue';
                this.saveReceivables();
            }
        }

        return {
            generatedAt: new Date().toISOString(),
            summary: {
                current: buckets.current.amount,
                '1-30': buckets['1-30'].amount,
                '31-60': buckets['31-60'].amount,
                '61-90': buckets['61-90'].amount,
                '90+': buckets['90+'].amount,
                total: Object.values(buckets).reduce((sum, b) => sum + b.amount, 0)
            },
            buckets
        };
    }

    /**
     * Get receivable schedule
     */
    getReceivableSchedule(days = 90) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return this.receivables
            .filter(r => r.status === 'pending' || r.status === 'overdue')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    /**
     * Get AR summary
     */
    getSummary() {
        const aging = this.getAgingReport();

        return {
            totalContracts: this.contracts.length,
            activeContracts: this.contracts.filter(c => c.status === 'active').length,
            contractValue: this.contracts
                .filter(c => c.status === 'active')
                .reduce((sum, c) => sum + (c.value || 0), 0),
            expiringNext90Days: this.getExpiringContracts(90).length,
            totalReceivables: this.receivables.length,
            openReceivables: this.receivables.filter(r => r.status !== 'paid').length,
            arBalance: aging.summary.total,
            overdueBalance: aging.summary['1-30'] + aging.summary['31-60'] + aging.summary['61-90'] + aging.summary['90+'],
            templates: this.templates.length
        };
    }

    /**
     * Execute a task from the orchestrator
     */
    async execute(task) {
        switch (task.action) {
            // Contracts
            case 'add_contract':
                return this.addContract(task.data);
            case 'update_contract':
                return this.updateContractStatus(task.data.id, task.data.status, task.data.notes);
            case 'get_expiring':
                return this.getExpiringContracts(task.data?.days || 90);
            case 'list_contracts':
                return this.contracts;

            // Templates
            case 'add_template':
                return this.addTemplate(task.data);
            case 'generate':
                return this.generateFromTemplate(task.data.templateId, task.data.variables);
            case 'list_templates':
                return this.templates;

            // Receivables
            case 'add_receivable':
                return this.addReceivable(task.data);
            case 'record_payment':
                return this.recordPayment(task.data.id, task.data.payment);
            case 'aging_report':
                return this.getAgingReport();
            case 'ar_schedule':
                return this.getReceivableSchedule(task.data?.days || 90);

            // Summary
            case 'summary':
                return this.getSummary();

            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ContractsModule;
