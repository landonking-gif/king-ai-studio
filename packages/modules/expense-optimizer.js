/**
 * ExpenseOptimizer - Implements ROI Improvement #48
 * Scrutinizes empire expenses and suggests cost-cutting measures.
 */

export class ExpenseOptimizer {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Analyze expenses for a business
     */
    async optimizeExpenses(expenses, businessName) {
        console.log(`[ExpenseOpt] Analyzing $${expenses.reduce((s, e) => s + e.amount, 0)} in expenses for ${businessName}`);

        const prompt = `Review these SaaS/Infrastructure expenses for "${businessName}":
        ${JSON.stringify(expenses)}
        
        Suggest 3 ways to reduce these costs.
        Output JSON with 'total_potential_savings', and an array of 'suggestions' each with 'expense', 'alternative', and 'savings'.`;

        const response = await this.modelRouter.complete(prompt);
        let plan;
        try {
            plan = JSON.parse(response.text);
        } catch (e) {
            plan = { suggestions: [] };
        }

        if (this.auditLogger) {
            this.auditLogger.logSystem('expense_optimization', { businessName, plan });
        }

        return plan;
    }
}

export default ExpenseOptimizer;
