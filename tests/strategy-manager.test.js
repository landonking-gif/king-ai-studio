
import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import StrategyManager from '../packages/core/strategy-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('StrategyManager - Load and Update', async (t) => {
    const testDataDir = path.join(__dirname, 'test-strategies');
    if (!fs.existsSync(testDataDir)) fs.mkdirSync(testDataDir);

    const mgr = new StrategyManager({ dataDir: testDataDir });

    const strategies = mgr.getApplicableStrategies('general');
    assert.ok(Array.isArray(strategies));

    await mgr.updateStrategy({
        taskType: 'general',
        success: true,
        improvements: ['New Rule']
    });

    const updated = mgr.getApplicableStrategies('general');
    assert.ok(updated.includes('New Rule'));

    // Cleanup
    if (fs.existsSync(testDataDir)) fs.rmSync(testDataDir, { recursive: true });
});
