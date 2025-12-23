
import test from 'node:test';
import assert from 'node:assert';
import ModelRouter from '../packages/core/model-router.js';

test('ModelRouter - Initialization', async (t) => {
    const router = new ModelRouter();
    assert.ok(router.apiKeys, 'Should have apiKeys object');
    assert.ok(router.models, 'Should have models configuration');
});

test('ModelRouter - parseKeys', async (t) => {
    const router = new ModelRouter();
    const keys = router.parseKeys('key1, valid-key, sk-key2');
    assert.strictEqual(keys.length, 1, 'Should filter out placeholders');
    assert.strictEqual(keys[0], 'valid-key');
});

test('ModelRouter - selectModel', async (t) => {
    const router = new ModelRouter();
    // Clear all keys to force fallback
    router.apiKeys = { openai: [], anthropic: [], gemini: [], deepseek: [] };
    router.apiKeys.anthropic = ['fake-key'];
    const model = router.selectModel('reasoning');
    assert.ok(model, 'Should select a model for reasoning');
    assert.ok(model.includes('anthropic'), 'Should select anthropic');
});

test('ModelRouter - executeModelRequest Mock', async (t) => {
    process.env.MOCK_AI = 'true';
    const router = new ModelRouter();
    const result = await router.executeModelRequest('ollama:fast', 'test prompt');
    assert.strictEqual(result.success, true);
    assert.ok(result.content, 'Should have mock content');
    process.env.MOCK_AI = 'false';
});
