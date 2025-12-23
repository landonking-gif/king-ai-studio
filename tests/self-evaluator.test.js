
import test from 'node:test';
import assert from 'node:assert';
import SelfEvaluator from '../packages/core/self-evaluator.js';

class MockModelRouter {
    async complete(prompt, type, options) {
        if (prompt.includes('hostile critic')) {
            return {
                success: true,
                content: JSON.stringify({
                    score: 0.9,
                    critique: "Great job.",
                    issues: [],
                    needs_rewrite: false,
                    strategy_update: []
                })
            };
        }
        return { success: true, content: "Mocked response" };
    }
}

test('SelfEvaluator - Evaluation Loop', async (t) => {
    const mockRouter = new MockModelRouter();
    const evaluator = new SelfEvaluator({ modelRouter: mockRouter });

    const result = await evaluator.evaluateAndImprove(
        "Write a hello world",
        "print('hello world')"
    );

    assert.strictEqual(result.was_rewritten, false);
    assert.strictEqual(result.critique.score, 0.9);
});
