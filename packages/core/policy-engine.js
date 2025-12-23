/**
 * Policy Engine - Core governance for the AI Studio
 * Determines what requires approval vs auto-approves
 */

// Task categories that require human approval
const APPROVAL_REQUIRED_CATEGORIES = [
    'legal',           // Any legal filings, contracts, compliance changes
    'financial',       // Money movement, banking, payments
    'funds_transfer',  // Direct funds movement
    'contract_signing',// Binding legal agreements
    'compliance_filing'// Regulatory submissions
];

// Task categories that auto-approve
const AUTO_APPROVE_CATEGORIES = [
    'document_management',  // File storage, organization
    'report_generation',    // Creating reports
    'data_backup',          // Backing up data
    'notification',         // Sending notifications
    'search',               // Searching documents
    'scheduling',           // Calendar operations
    'reminder',             // Setting reminders
    'template_creation',    // Creating templates
    'status_update'         // Updating task statuses
];

export class PolicyEngine {
    constructor(config = {}) {
        this.approvalCategories = config.approvalCategories || APPROVAL_REQUIRED_CATEGORIES;
        this.autoApproveCategories = config.autoApproveCategories || AUTO_APPROVE_CATEGORIES;
        this.defaultAutoApprove = config.defaultAutoApprove ?? true;
    }

    /**
     * Evaluate if a task requires human approval
     * @param {Object} task - The task to evaluate
     * @returns {Object} - { requiresApproval: boolean, reason: string }
     */
    evaluate(task) {
        const { category, type, metadata = {} } = task;

        // Check for explicit approval-required categories
        if (this.approvalCategories.includes(category)) {
            return {
                requiresApproval: true,
                reason: `Category "${category}" requires human approval`,
                approvalType: 'category_restriction'
            };
        }

        // Check for money-related keywords
        const moneyKeywords = ['money', 'payment', 'transfer', 'bank', 'funds', 'invoice_pay', 'wire'];
        const taskText = JSON.stringify(task).toLowerCase();
        for (const keyword of moneyKeywords) {
            if (taskText.includes(keyword)) {
                return {
                    requiresApproval: true,
                    reason: `Task contains financial keyword: "${keyword}"`,
                    approvalType: 'financial_safeguard'
                };
            }
        }

        // Check for legal keywords
        const legalKeywords = ['legal', 'lawsuit', 'court', 'attorney', 'settlement', 'sue', 'litigation'];
        for (const keyword of legalKeywords) {
            if (taskText.includes(keyword)) {
                return {
                    requiresApproval: true,
                    reason: `Task contains legal keyword: "${keyword}"`,
                    approvalType: 'legal_safeguard'
                };
            }
        }

        // Check for explicit auto-approve categories
        if (this.autoApproveCategories.includes(category)) {
            return {
                requiresApproval: false,
                reason: `Category "${category}" is auto-approved`,
                approvalType: 'auto_approved'
            };
        }

        // Default behavior
        return {
            requiresApproval: !this.defaultAutoApprove,
            reason: this.defaultAutoApprove
                ? 'Default auto-approve policy applied'
                : 'Default requires approval policy applied',
            approvalType: 'default_policy'
        };
    }

    /**
     * Validate task against hard constraints
     * @param {Object} task - The task to validate
     * @returns {Object} - { valid: boolean, violations: string[] }
     */
    validateConstraints(task) {
        const violations = [];

        // Check for dual-auth requirement on financial tasks
        if (task.category === 'financial' && !task.metadata?.dualAuth) {
            violations.push('Financial tasks require dual authorization');
        }

        // Check for compliance template requirement on legal tasks
        if (task.category === 'legal' && !task.metadata?.complianceReviewed) {
            violations.push('Legal tasks must be compliance reviewed');
        }

        return {
            valid: violations.length === 0,
            violations
        };
    }

    /**
     * Generate approval request format for email
     * @param {Object} task - The task requiring approval
     * @returns {Object} - Formatted approval request
     */
    formatApprovalRequest(task) {
        return {
            subject: `🔔 Approval Required: ${task.name}`,
            body: `
**What:** ${task.description}

**Why:** ${task.reasoning || 'Standard operation'}

**Category:** ${task.category}

**Impact:** ${task.impact || 'Normal business operation'}

---
**Is it OK to implement this?**

Reply: YES / NO / [Ask a question for more info]
      `.trim()
        };
    }
}

export default PolicyEngine;
