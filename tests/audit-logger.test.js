
import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import AuditLogger from '../packages/core/audit-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('AuditLogger - Logging', async (t) => {
    const testLogDir = path.join(__dirname, 'test-logs');
    if (!fs.existsSync(testLogDir)) fs.mkdirSync(testLogDir);

    const logger = new AuditLogger({ logDir: testLogDir });

    logger.logSystem('test_event', { detail: 'unit test' });

    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(testLogDir, `${date}.jsonl.gz`);
    assert.ok(fs.existsSync(logFile), 'Audit log file should exist');

    const compressed = fs.readFileSync(logFile);
    const content = zlib.gunzipSync(compressed).toString('utf-8');
    assert.ok(content.includes('test_event'), 'Log should contain the event name');

    // Cleanup
    if (fs.existsSync(testLogDir)) fs.rmSync(testLogDir, { recursive: true });
});
