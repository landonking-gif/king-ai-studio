/**
 * Policy Checker - Validates proposals against policy rules
 * Part of the Evaluation Layer
 */

import { PolicyEngine } from '../core/policy-engine.js';

export class PolicyChecker {
    constructor(config = {}) {
        this.policyEngine = config.policyEngine || new PolicyEngine(config);
        this.customRules = config.customRules || [];
    }

    /**
     * Add a custom rule
     */
    addRule(rule) {
        this.customRules.push({
            id: rule.id || `rule-${Date.now()}`,
            name: rule.name,
            check: rule.check, // Function that returns { pass: boolean, message: string }
            severity: rule.severity || 'warning' // error, warning, info
        });
    }

    /**
     * Check a proposal against all rules
     */
    check(proposal) {
        const results = {
            passed: true,
            errors: [],
            warnings: [],
            info: []
        };

        // Check against policy engine
        const policyResult = this.policyEngine.evaluate(proposal);
        if (policyResult.requiresApproval) {
            results.warnings.push({
                rule: 'policy-engine',
                message: policyResult.reason,
                type: policyResult.approvalType
            });
        }

        // Check constraints
        const constraints = this.policyEngine.validateConstraints(proposal);
        if (!constraints.valid) {
            results.passed = false;
            for (const violation of constraints.violations) {
                results.errors.push({
                    rule: 'constraint-violation',
                    message: violation
                });
            }
        }

        // Check custom rules
        for (const rule of this.customRules) {
            try {
                const result = rule.check(proposal);
                if (!result.pass) {
                    const entry = { rule: rule.name, message: result.message };

                    if (rule.severity === 'error') {
                        results.passed = false;
                        results.errors.push(entry);
                    } else if (rule.severity === 'warning') {
                        results.warnings.push(entry);
                    } else {
                        results.info.push(entry);
                    }
                }
            } catch (err) {
                results.warnings.push({
                    rule: rule.name,
                    message: `Rule check failed: ${err.message}`
                });
            }
        }

        return results;
    }

    /**
     * Check if a change is safe to auto-deploy
     */
    isSafeToAutoDeploy(proposal) {
        const check = this.check(proposal);

        // Must pass all checks and have no warnings
        if (!check.passed || check.errors.length > 0) {
            return { safe: false, reason: 'Failed policy checks', details: check.errors };
        }

        // Check for high-risk indicators
        const riskIndicators = [
            'database', 'delete', 'drop', 'production', 'credentials',
            'password', 'secret', 'financial', 'payment'
        ];

        const proposalText = JSON.stringify(proposal).toLowerCase();
        for (const indicator of riskIndicators) {
            if (proposalText.includes(indicator)) {
                return {
                    safe: false,
                    reason: `Contains high-risk indicator: ${indicator}`,
                    requiresReview: true
                };
            }
        }

        return { safe: true };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'check':
                return this.check(task.data);
            case 'is_safe':
                return this.isSafeToAutoDeploy(task.data);
            case 'add_rule':
                return this.addRule(task.data);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default PolicyChecker;
