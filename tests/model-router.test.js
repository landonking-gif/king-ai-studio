
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
    router.apiKeys = { openai: [], anthropic: [], gemini: [], deepseek: [], huggingface: [] };
    router.apiKeys.huggingface = ['fake-key'];

    // Use 'creative' task type where huggingface is 2nd preference after gemini
    const model = router.selectModel('creative');
    assert.ok(model, 'Should select a model for creative task');
    assert.ok(model.includes('huggingface'), `Should select huggingface, got ${model}`);
});

test('ModelRouter - API Key Rotation', async (t) => {
    const router = new ModelRouter();
    router.apiKeys.gemini = ['key1', 'key2', 'key3'];

    assert.strictEqual(router.getApiKey('gemini'), 'key1');
    assert.strictEqual(router.getApiKey('gemini'), 'key2');
    assert.strictEqual(router.getApiKey('gemini'), 'key3');
    assert.strictEqual(router.getApiKey('gemini'), 'key1'); // Loop back
});

test('ModelRouter - executeModelRequest Mock', async (t) => {
    process.env.MOCK_AI = 'true';
    const router = new ModelRouter();
    const result = await router.executeModelRequest('ollama:fast', 'test prompt');
    assert.strictEqual(result.success, true);
    assert.ok(result.content, 'Should have mock content');
    process.env.MOCK_AI = 'false';
});
