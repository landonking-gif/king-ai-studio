
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Empire Entry Point - Smoke Test', (t, done) => {
    const empirePath = path.join(__dirname, '../empire.js');

    // We expect it to at least start and maybe log something before we kill it
    // Use MOCK_AI to avoid real calls
    const child = spawn('node', [empirePath], {
        env: { ...process.env, MOCK_AI: 'true', PORT: '0' } // Port 0 to avoid EADDRINUSE
    });

    let output = '';
    let finished = false;
    child.stdout.on('data', (data) => {
        output += data.toString();
        if (!finished && (output.includes('KING AI STUDIO') || output.includes('CEO'))) {
            finished = true;
            child.kill();
            assert.ok(true);
            done();
        }
    });

    child.stderr.on('data', (data) => {
        console.error('Empire Smoke Test Error:', data.toString());
    });

    setTimeout(() => {
        if (!finished) {
            finished = true;
            child.kill();
            if (!output) {
                assert.fail('Empire did not produce any output in 10s');
            }
            done();
        }
    }, 10000);
});
