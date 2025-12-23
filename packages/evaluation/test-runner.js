/**
 * Test Runner - Executes test suites and reports results
 * Part of the Evaluation Layer
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TestRunner {
    constructor(config = {}) {
        this.resultsDir = config.resultsDir || path.join(__dirname, '../../data/test-results');
        this.ensureResultsDir();
    }

    ensureResultsDir() {
        if (!fs.existsSync(this.resultsDir)) {
            fs.mkdirSync(this.resultsDir, { recursive: true });
        }
    }

    /**
     * Run a command and capture output
     */
    runCommand(command, args, cwd) {
        return new Promise((resolve) => {
            const proc = spawn(command, args, { cwd, shell: true });
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (code) => {
                resolve({ code, stdout, stderr, success: code === 0 });
            });

            proc.on('error', (err) => {
                resolve({ code: -1, stdout, stderr: err.message, success: false });
            });
        });
    }

    /**
     * Run npm test
     */
    async runNpmTest(projectPath) {
        const result = await this.runCommand('npm', ['test'], projectPath);
        return this.saveResult('npm-test', result);
    }

    /**
     * Run Node.js built-in test runner on a file
     */
    async runNodeTest(testFile) {
        const result = await this.runCommand('node', ['--test', testFile], path.dirname(testFile));
        return this.saveResult(`node-test-${path.basename(testFile)}`, result);
    }

    /**
     * Run a custom test command
     */
    async runCustomTest(command, cwd) {
        const result = await this.runCommand(command, [], cwd);
        return this.saveResult('custom-test', result);
    }

    /**
     * Save test result to file
     */
    saveResult(name, result) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${name}-${timestamp}.json`;
        const filePath = path.join(this.resultsDir, filename);

        const report = {
            name,
            timestamp: new Date().toISOString(),
            success: result.success,
            exitCode: result.code,
            stdout: result.stdout,
            stderr: result.stderr
        };

        fs.writeFileSync(filePath, JSON.stringify(report, null, 2));

        return {
            ...report,
            resultFile: filePath
        };
    }

    /**
     * Get recent test results
     */
    getRecentResults(limit = 10) {
        const files = fs.readdirSync(this.resultsDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse()
            .slice(0, limit);

        return files.map(f => {
            const content = fs.readFileSync(path.join(this.resultsDir, f), 'utf-8');
            return JSON.parse(content);
        });
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'npm_test':
                return this.runNpmTest(task.data.path);
            case 'node_test':
                return this.runNodeTest(task.data.file);
            case 'custom':
                return this.runCustomTest(task.data.command, task.data.cwd);
            case 'recent':
                return this.getRecentResults(task.data?.limit);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default TestRunner;
