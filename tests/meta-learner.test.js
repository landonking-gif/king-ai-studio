
import test from 'node:test';
import assert from 'node:assert';
import MetaLearner from '../packages/core/meta-learner.js';

class MockModelRouter {
    constructor() {
        this.systemPrompt = "Original Prompt";
    }
    setSystemPrompt(p) { this.systemPrompt = p; }
    async complete(prompt, type, options) {
        if (prompt.includes('extract 1-2 general principles')) {
            return {
                success: true,
                content: JSON.stringify({
                    principles: ["New Principle"],
                    reasoning: "Test reasoning"
                })
            };
        }
        return { success: true, content: "New System Prompt with New Principle" };
    }
}

test('MetaLearner - Principle Extraction', async (t) => {
    const mockRouter = new MockModelRouter();
    const learner = new MetaLearner({ modelRouter: mockRouter });

    const principles = await learner.extractPrinciples({
        taskDescription: "Test Task",
        finalOutput: "Some output",
        critique: { issues: ["Minor issue"] },
        wasRewritten: true
    });

    assert.ok(principles.includes("New Principle"));
    assert.ok(mockRouter.systemPrompt.includes("New Principle"));
});
