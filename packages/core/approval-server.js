/**
 * Approval Server - Web interface for approving/rejecting tasks
 * Provides REST API and simple web UI for human oversight
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { EmailNotifier } from './email-notifier.js';

import { Database } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ApprovalServer {
    constructor(config = {}) {
        this.port = config.port || process.env.APPROVAL_PORT || 3847;
        this.host = config.host || '0.0.0.0';
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/ceo');
        this.dashboardDir = path.join(__dirname, '../infrastructure/dashboard');
        this.db = config.db || new Database(config);

        this.emailNotifier = config.emailNotifier;
        this.server = null;
        this.onApproval = config.onApproval || (() => { });
        this.onRejection = config.onRejection || (() => { });

        this.ensureDataDir();
    }

    async init() {
        await this.db.init();
        return this;
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Load pending approvals
     */
    loadApprovals() {
        if (fs.existsSync(this.approvalsFile)) {
            return JSON.parse(fs.readFileSync(this.approvalsFile, 'utf-8'));
        }
        return [];
    }

    /**
     * Save approvals
     */
    saveApprovals(approvals) {
        fs.writeFileSync(this.approvalsFile, JSON.stringify(approvals, null, 2));
    }

    /**
     * Add a pending approval
     */
    addApproval(approval) {
        const approvals = this.loadApprovals();
        const entry = {
            id: `approval-${Date.now()}`,
            ...approval,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        approvals.push(entry);
        this.saveApprovals(approvals);

        // Send notification email with approval link
        if (this.emailNotifier) {
            const approveUrl = `http://${this.host}:${this.port}/approve/${entry.id}`;
            const rejectUrl = `http://${this.host}:${this.port}/reject/${entry.id}`;

            this.emailNotifier.sendNotification(
                `🔔 Approval Required: ${entry.taskType || entry.type}`,
                `A task requires your approval:

**Type:** ${entry.taskType || entry.type}
**Description:** ${entry.description || JSON.stringify(entry.data, null, 2)}
**Risk Level:** ${entry.riskLevel || 'Standard'}
**Created:** ${entry.createdAt}

**Actions:**
✅ Approve: ${approveUrl}
❌ Reject: ${rejectUrl}

Or visit the approval dashboard: http://${this.host}:${this.port}/
`
            ).catch(console.error);
        }

        return entry;
    }

    async approve(id, notes = '') {
        if (this.db) {
            const result = await this.db.pool.query('SELECT * FROM approvals WHERE id = $1 AND status = $2', [id, 'pending']);
            if (result.rows.length > 0) {
                const app = result.rows[0];
                app.status = 'approved';
                app.decided_at = new Date().toISOString();
                app.notes = notes;
                await this.db.saveApproval(app);
                this.onApproval(app);
                return { success: true, item: app };
            }
        }
        return { success: false, error: 'Approval not found in DB' };
    }

    async reject(id, reason = '') {
        if (this.db) {
            const result = await this.db.pool.query('SELECT * FROM approvals WHERE id = $1 AND status = $2', [id, 'pending']);
            if (result.rows.length > 0) {
                const app = result.rows[0];
                app.status = 'rejected';
                app.decided_at = new Date().toISOString();
                app.notes = reason;
                await this.db.saveApproval(app);
                this.onRejection(app);
                return { success: true, item: app };
            }
        }
        return { success: false, error: 'Approval not found in DB' };
    }

    /**
     * Get pending approvals
     */
    getPending() {
        return this.loadApprovals().filter(a => a.status === 'pending');
    }

    /**
     * Generate web UI HTML
     */
    generateDashboardHtml() {
        const pending = this.getPending();
        const all = this.loadApprovals();

        return `<!DOCTYPE html>
<html>
<head>
    <title>🏛️ King AI - Approval Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { 
            font-size: 2rem; 
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat {
            background: rgba(255,255,255,0.1);
            padding: 15px 25px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value { font-size: 2rem; font-weight: bold; }
        .stat-label { opacity: 0.7; font-size: 0.9rem; }
        .pending { color: #ffc107; }
        .approved { color: #28a745; }
        .rejected { color: #dc3545; }
        .card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .card-type {
            background: rgba(255,193,7,0.2);
            color: #ffc107;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
        }
        .card-time { opacity: 0.5; font-size: 0.85rem; }
        .card-body { margin-bottom: 15px; }
        .card-desc { 
            background: rgba(0,0,0,0.2);
            padding: 10px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }
        .actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 10px 25px;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.1s;
        }
        .btn:hover { transform: scale(1.02); }
        .btn-approve { background: #28a745; color: #fff; }
        .btn-reject { background: #dc3545; color: #fff; }
        .empty {
            text-align: center;
            padding: 40px;
            opacity: 0.5;
        }
        .refresh {
            background: rgba(255,255,255,0.1);
            color: #fff;
            float: right;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            🏛️ King AI - Approval Dashboard
            <a href="/" class="btn refresh">🔄 Refresh</a>
        </h1>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value pending">${pending.length}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat">
                <div class="stat-value approved">${all.filter(a => a.status === 'approved').length}</div>
                <div class="stat-label">Approved</div>
            </div>
            <div class="stat">
                <div class="stat-value rejected">${all.filter(a => a.status === 'rejected').length}</div>
                <div class="stat-label">Rejected</div>
            </div>
        </div>

        <h2 style="margin-bottom: 15px;">Pending Approvals</h2>
        
        ${pending.length === 0 ? `
            <div class="card empty">
                ✅ No pending approvals. The AI is operating within policy.
            </div>
        ` : pending.map(item => `
            <div class="card">
                <div class="card-header">
                    <span class="card-type">${item.taskType || item.type || 'Task'}</span>
                    <span class="card-time">${new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <div class="card-body">
                    <div class="card-desc">${item.description || JSON.stringify(item.data || item, null, 2)}</div>
                </div>
                <div class="actions">
                    <a href="/approve/${item.id}" class="btn btn-approve">✅ Approve</a>
                    <a href="/reject/${item.id}" class="btn btn-reject">❌ Reject</a>
                </div>
            </div>
        `).join('')}
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
    }

    /**
     * Handle HTTP requests
     */
    async handleRequest(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        // Static File Serving
        if (pathname === '/' || pathname === '/index.html') {
            const html = fs.readFileSync(path.join(this.dashboardDir, 'index.html'), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(html);
        } else if (pathname === '/style.css') {
            const css = fs.readFileSync(path.join(this.dashboardDir, 'style.css'), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/css' });
            return res.end(css);
        } else if (pathname === '/dashboard.js') {
            const js = fs.readFileSync(path.join(this.dashboardDir, 'dashboard.js'), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            return res.end(js);
        }

        // API Endpoints
        if (pathname === '/api/all-data') {
            const businesses = await this.db.getAllBusinesses();
            const approvals = await this.db.getPendingApprovals();
            // Fetch recent logs
            const logResult = await this.db.pool.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');
            const logs = logResult.rows;

            // Calculate total profit (heuristic for demo)
            const totalProfit = businesses.length * 1500; // Mock calculation

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                businesses,
                approvals,
                logs,
                totalProfit
            }));

        } else if (pathname === '/api/pending') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(await this.db.getPendingApprovals()));

        } else if (pathname === '/api/approve' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const data = JSON.parse(body);
                const result = await this.approve(data.id, data.notes);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            });

        } else if (pathname === '/api/reject' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const data = JSON.parse(body);
                const result = await this.reject(data.id, data.reason);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    }

    /**
     * Start the server
     */
    start() {
        return new Promise((resolve, reject) => {
            const basePort = parseInt(this.port);

            const tryListen = (attempt = 0) => {
                const currentPort = basePort + attempt;

                if (attempt > 100) {
                    return reject(new Error('Could not find free port after 100 attempts'));
                }

                this.server = http.createServer((req, res) => this.handleRequest(req, res));

                this.server.on('error', (e) => {
                    if (e.code === 'EADDRINUSE') {
                        this.server.close();
                        // Wait a tiny bit before retrying to let OS cleanup
                        setTimeout(() => tryListen(attempt + 1), Math.floor(Math.random() * 100));
                    } else {
                        reject(e);
                    }
                });

                this.server.listen(currentPort, () => {
                    console.log(`[ApprovalServer] Running at http://0.0.0.0:${currentPort}`);
                    // Update instance port to the actual bound port
                    this.port = currentPort;
                    resolve({ success: true, url: `http://${this.host}:${currentPort}` });
                });
            };

            tryListen();
        });
    }

    /**
     * Stop the server
     */
    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}

export default ApprovalServer;
