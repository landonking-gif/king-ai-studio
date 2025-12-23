/**
 * Empire Daemon - Persistent background service for autonomous operation
 * Manages the Empire loop with auto-restart and health monitoring
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmpireDaemon {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, 'data/daemon');
        this.pidFile = path.join(this.dataDir, 'empire.pid');
        this.logFile = path.join(this.dataDir, 'empire.log');
        this.stateFile = path.join(this.dataDir, 'daemon-state.json');

        this.restartDelay = config.restartDelay || 5000;
        this.maxRestarts = config.maxRestarts || 10;
        this.restartCount = 0;
        this.isRunning = false;
        this.childProcess = null;

        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Write to log file
     */
    log(message) {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(this.logFile, logLine);
        console.log(message);
    }

    /**
     * Save daemon state
     */
    saveState() {
        const state = {
            pid: process.pid,
            isRunning: this.isRunning,
            restartCount: this.restartCount,
            startedAt: this.startedAt,
            lastUpdate: new Date().toISOString()
        };
        fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
    }

    /**
     * Start the Empire as a child process
     */
    startEmpireProcess() {
        this.log('Starting Empire process...');

        this.childProcess = spawn('node', ['empire.js'], {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        // Capture stdout
        this.childProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => this.log(`[Empire] ${line}`));
        });

        // Capture stderr
        this.childProcess.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => this.log(`[Empire ERROR] ${line}`));
        });

        // Handle exit
        this.childProcess.on('exit', (code, signal) => {
            this.log(`Empire process exited with code ${code}, signal ${signal}`);

            if (this.isRunning && this.restartCount < this.maxRestarts) {
                this.restartCount++;
                this.log(`Restarting in ${this.restartDelay}ms (attempt ${this.restartCount}/${this.maxRestarts})...`);

                setTimeout(() => {
                    if (this.isRunning) {
                        this.startEmpireProcess();
                    }
                }, this.restartDelay);
            } else if (this.restartCount >= this.maxRestarts) {
                this.log('Max restarts reached. Daemon stopping.');
                this.isRunning = false;
                this.saveState();
            }
        });

        this.childProcess.on('error', (error) => {
            this.log(`Empire process error: ${error.message}`);
        });

        this.log(`Empire process started with PID: ${this.childProcess.pid}`);
    }

    /**
     * Start the daemon
     */
    start() {
        if (this.isRunning) {
            this.log('Daemon is already running');
            return { success: false, error: 'Already running' };
        }

        // Save PID
        fs.writeFileSync(this.pidFile, process.pid.toString());

        this.isRunning = true;
        this.startedAt = new Date().toISOString();
        this.restartCount = 0;
        this.saveState();

        this.log('Empire Daemon starting...');
        this.startEmpireProcess();

        // Reset restart count periodically (every hour of successful running)
        setInterval(() => {
            if (this.isRunning && this.restartCount > 0) {
                this.restartCount = Math.max(0, this.restartCount - 1);
                this.saveState();
            }
        }, 3600000);

        return { success: true, pid: process.pid };
    }

    /**
     * Stop the daemon
     */
    stop() {
        this.log('Stopping Empire Daemon...');
        this.isRunning = false;

        if (this.childProcess) {
            this.childProcess.kill('SIGTERM');
            this.childProcess = null;
        }

        // Clean up PID file
        if (fs.existsSync(this.pidFile)) {
            fs.unlinkSync(this.pidFile);
        }

        this.saveState();
        this.log('Empire Daemon stopped');

        return { success: true };
    }

    /**
     * Get daemon status
     */
    status() {
        if (fs.existsSync(this.stateFile)) {
            return JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        }
        return { isRunning: false };
    }
}

// CLI handling
const args = process.argv.slice(2);
const command = args[0];

const daemon = new EmpireDaemon();

switch (command) {
    case 'start':
        const startResult = daemon.start();
        if (startResult.success) {
            console.log(`Empire Daemon started (PID: ${startResult.pid})`);
            console.log('Press Ctrl+C to stop');

            // Keep process alive
            process.on('SIGINT', () => {
                daemon.stop();
                process.exit(0);
            });
            process.on('SIGTERM', () => {
                daemon.stop();
                process.exit(0);
            });
        }
        break;

    case 'stop':
        daemon.stop();
        break;

    case 'status':
        console.log(JSON.stringify(daemon.status(), null, 2));
        break;

    case 'restart':
        daemon.stop();
        setTimeout(() => daemon.start(), 2000);
        break;

    default:
        console.log(`
Empire Daemon - Background service for King AI Studio

Usage:
  node empire-daemon.js start    Start the daemon
  node empire-daemon.js stop     Stop the daemon
  node empire-daemon.js status   Check daemon status
  node empire-daemon.js restart  Restart the daemon

For production use, consider using PM2:
  pm2 start empire.js --name "king-ai-empire"
`);
}

export default EmpireDaemon;
