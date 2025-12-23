
import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import CEOAgent from '../packages/ceo/ceo-agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('System Integration - CEOAgent Analysis', async (t) => {
    // Force mock AI for the whole integration test to avoid external dependencies
    process.env.MOCK_AI = 'true';

    const testDbPath = path.join(__dirname, `test-system-${Date.now()}.db`);
    const testDataDir = path.join(__dirname, `test-data-${Date.now()}`);

    // Config pointing to test DB and local data
    const config = {
        dbPath: testDbPath,
        dataDir: testDataDir
    };

    const ceo = new CEOAgent(config);
    await ceo.init();

    const businessIdea = {
        description: 'AI for testing system integrity',
        industry: 'Quality Assurance'
    };

    const result = await ceo.startBusiness(businessIdea);

    assert.strictEqual(result.success, true);
    assert.ok(result.analysis);
    assert.ok(result.plan);

    // Cleanup
    await ceo.db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(config.dataDir)) fs.rmSync(config.dataDir, { recursive: true });

    process.env.MOCK_AI = 'false';
});
