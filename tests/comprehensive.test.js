
import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
    PolicyEngine,
    DailySummarizer,
    AIProvider,
    AuditLogger,
    Database
} from '../packages/core/index.js';
import SecurityVault from '../packages/core/security-vault.js';
import EmailCampaigner from '../packages/modules/email-campaigner.js';
import { ErrorAnalyzer } from '../packages/core/error-analyzer.js';
import { RealtimeAPI } from '../packages/core/realtime-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('PolicyEngine - Evaluation', (t) => {
    const engine = new PolicyEngine();

    // Test auto-approve
    const res1 = engine.evaluate({ category: 'report_generation', name: 'Test' });
    assert.strictEqual(res1.requiresApproval, false);

    // Test restriction
    const res2 = engine.evaluate({ category: 'legal', name: 'Contract' });
    assert.strictEqual(res2.requiresApproval, true);
    assert.ok(res2.reason.includes('legal'));

    // Test keyword detection
    const res3 = engine.evaluate({ category: 'other', description: 'Pay the bank funds' });
    assert.strictEqual(res3.requiresApproval, true);
    assert.ok(res3.reason.includes('bank'));
});

test('SecurityVault - Encrypt/Decrypt', (t) => {
    // Import directly since it's not in core index
    const vault = new SecurityVault({ masterKey: Buffer.alloc(32, 'a') });
    const secret = "Super Secret Data";
    const encrypted = vault.encrypt(secret);
    assert.notStrictEqual(encrypted, secret);
    const decrypted = vault.decrypt(encrypted);
    assert.strictEqual(decrypted, secret);
});

test('AIProvider - simulatedComplete', async (t) => {
    const ai = new AIProvider({ provider: 'ollama' }); // use defaults
    // Test a business idea prompt triggers simulation if fetch fails (which it will if no ollama)
    // Actually simulatedComplete is directly testable
    const res = await ai.simulatedComplete("Analyze this business idea: AI for cleaning");
    assert.strictEqual(res.success, true);
    const content = JSON.parse(res.content);
    assert.ok(content.viability);
});

test('DailySummarizer - generateQuestions', (t) => {
    const summarizer = new DailySummarizer();
    const logs = [
        { type: 'execution', status: 'failed', taskId: '1' },
        { type: 'proposal', evaluation: { requiresApproval: true }, task: { id: '2' } }
    ];
    const questions = summarizer.generateQuestions(logs);
    assert.strictEqual(questions.length, 2);
    assert.ok(questions[0].includes('failed'));
    assert.ok(questions[1].includes('pending approval'));
});

test('EmailCampaigner - Sequence Generation', async (t) => {
    const mockRouter = {
        complete: async (prompt) => ({
            success: true,
            content: JSON.stringify([
                { day: 1, subject: "Hello", body: "World" }
            ])
        })
    };
    const campaigner = new EmailCampaigner({ modelRouter: mockRouter });
    const sequence = await campaigner.generateSequence({ email: 'test@example.com' }, "SaaS");
    assert.strictEqual(sequence.length, 1);
    assert.strictEqual(sequence[0].subject, "Hello");
    assert.strictEqual(sequence[0].subject, "Hello");
});

test('ErrorAnalyzer - Analyze', async (t) => {
    // Mock AuditLogger
    const mockLogger = {
        getTodayLogs: () => [
            { type: 'execution', status: 'failed', task: { id: 1 }, result: { error: 'Ollama failed' }, timestamp: new Date().toISOString() },
            { type: 'execution', status: 'failed', task: { id: 2 }, result: { error: 'Ollama failed' }, timestamp: new Date().toISOString() },
            { type: 'system', event: 'error', details: { message: 'DB Error' }, timestamp: new Date().toISOString() }
        ]
    };
    const analyzer = new ErrorAnalyzer({ auditLogger: mockLogger });
    const errors = await analyzer.analyzeRecentErrors();

    assert.ok(errors.length >= 2, 'Should group errors');
    assert.strictEqual(errors[0].count, 2, 'Should count duplicates');
    assert.strictEqual(errors[0].signature, 'Ollama failed');

    const file = analyzer.guessSourceFile('Ollama failed');
    assert.ok(file.includes('model-router'), 'Should guess model-router');
});

test('RealtimeAPI - Broadcast', (t) => {
    const api = new RealtimeAPI();
    let received = null;

    // Mock Client
    const mockRes = {
        write: (data) => {
            if (data.startsWith('data:')) {
                received = JSON.parse(data.substring(6).trim());
            }
        },
        writeHead: () => { },
        on: () => { } // handle 'close' event
    };

    api.handleConnection({ on: () => { } }, mockRes);
    api.broadcast('test-event', { value: 123 });

    assert.ok(received, 'Client should receive broadcast');
    assert.strictEqual(received.type, 'test-event');
    assert.strictEqual(received.data.value, 123);

    const stats = api.getStats();
    assert.strictEqual(stats.clients, 1);
});
