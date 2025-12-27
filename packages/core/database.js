/**
 * Database Module - SQLite persistence for King AI Studio
 * Handles businesses, tasks, approvals, and logging
 */

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
    constructor(config = {}) {
        this.dbPath = config.dbPath || path.join(__dirname, '../../data/king-ai.db');
        this.db = null;
        this.queryCache = new Map(); // Simple in-memory cache for read queries
    }

    /**
     * Initialize the database and create tables
     */
    init() {
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('busy_timeout = 5000');

        this.createTables();
        console.log(`[Database] Initialized at ${this.dbPath}`);
        return this;
    }

    /**
     * Create necessary tables if they don't exist
     */
    createTables() {
        // Businesses table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS businesses (
                id TEXT PRIMARY KEY,
                name TEXT,
                idea TEXT,
                analysis_id TEXT,
                plan_id TEXT,
                status TEXT,
                started_at TEXT,
                revenue REAL DEFAULT 0,
                expenses REAL DEFAULT 0,
                priority REAL DEFAULT 1.0,
                metadata TEXT
            )
        `);

        // Tasks table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                business_id TEXT,
                plan_id TEXT,
                phase TEXT,
                name TEXT,
                description TEXT,
                automated INTEGER,
                requires_approval INTEGER,
                status TEXT,
                result TEXT,
                priority REAL DEFAULT 0,
                created_at TEXT,
                FOREIGN KEY(business_id) REFERENCES businesses(id)
            )
        `);

        // Approvals table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                type TEXT,
                title TEXT,
                description TEXT,
                amount REAL,
                impact INTEGER,
                recommendation TEXT,
                status TEXT,
                created_at TEXT,
                decided_at TEXT,
                notes TEXT,
                FOREIGN KEY(task_id) REFERENCES tasks(id)
            )
        `);

        // System/Execution Logs
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_id TEXT,
                timestamp TEXT,
                type TEXT,
                message TEXT,
                phase TEXT,
                FOREIGN KEY(business_id) REFERENCES businesses(id)
            )
        `);

        // Empire State
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS empire_state (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Negotiations table for ROI #2
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS negotiations (
                id TEXT PRIMARY KEY,
                business_id TEXT,
                vendor_name TEXT,
                item TEXT,
                status TEXT,
                offers TEXT, -- JSON array of offers
                final_offer TEXT, -- JSON object
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY(business_id) REFERENCES businesses(id)
            )
        `);

        // Migrations (Naive) - Ensure new columns exist
        const columns = ['revenue', 'expenses', 'priority'];
        for (const col of columns) {
            try {
                this.db.exec(`ALTER TABLE businesses ADD COLUMN ${col} REAL DEFAULT 0`);
            } catch (e) {
                // Ignore if column already exists
            }
        }

        // Migration for tasks.priority
        try {
            this.db.exec(`ALTER TABLE tasks ADD COLUMN priority REAL DEFAULT 0`);
        } catch (e) {
            // Ignore
        }

        // Ensure 'system' business exists
        this.db.prepare(`
            INSERT OR IGNORE INTO businesses (id, name, idea, status, started_at)
            VALUES (?, ?, ?, ?, ?)
        `).run('system', 'System', 'System Operations', 'active', new Date().toISOString());
    }

    // --- Business Methods ---

    saveBusiness(business) {
        const { id, name, idea, analysis_id, plan_id, status, started_at, revenue, expenses, priority, ...metadata } = business;
        this.db.prepare(
            `INSERT OR REPLACE INTO businesses (id, name, idea, analysis_id, plan_id, status, started_at, revenue, expenses, priority, metadata) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, name, idea, analysis_id, plan_id, status, started_at, revenue || 0, expenses || 0, priority || 1.0, JSON.stringify(metadata));
        this.queryCache.delete('all_businesses');
    }

    getBusiness(id) {
        const row = this.db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
        if (row && row.metadata) {
            return { ...row, ...JSON.parse(row.metadata) };
        }
        return row;
    }

    getAllBusinesses() {
        const cacheKey = 'all_businesses';
        if (this.queryCache.has(cacheKey)) {
            return this.queryCache.get(cacheKey);
        }
        const rows = this.db.prepare('SELECT * FROM businesses').all();
        const results = rows.map(row => ({ ...row, ...(row.metadata ? JSON.parse(row.metadata) : {}) }));
        this.queryCache.set(cacheKey, results);
        return results;
    }

    // --- Task Methods ---

    saveTask(task) {
        const { id, business_id, plan_id, phase, name, description, automated, requires_approval, status, result, priority, created_at } = task;
        this.db.prepare(
            `INSERT OR REPLACE INTO tasks (id, business_id, plan_id, phase, name, description, automated, requires_approval, status, result, priority, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, business_id, plan_id, phase, name, description, automated ? 1 : 0, requires_approval ? 1 : 0, status, JSON.stringify(result), priority || 0, created_at);
    }

    getTasksForBusiness(businessId) {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE business_id = ?').all(businessId);
        return rows.map(row => ({ ...row, result: row.result ? JSON.parse(row.result) : null }));
    }

    getQueuedTasks() {
        const rows = this.db.prepare("SELECT * FROM tasks WHERE status = 'queued' ORDER BY priority DESC").all();
        return rows.map(row => ({ ...row, result: row.result ? JSON.parse(row.result) : null }));
    }

    // --- Approval Methods ---

    saveApproval(approval) {
        const { id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes } = approval;
        this.db.prepare(
            `INSERT OR REPLACE INTO approvals (id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes);
    }

    getPendingApprovals() {
        return this.db.prepare("SELECT * FROM approvals WHERE status = 'pending'").all();
    }

    // --- Logging Methods ---

    log(businessId, type, message, phase = null) {
        this.db.prepare(
            'INSERT INTO logs (business_id, timestamp, type, message, phase) VALUES (?, ?, ?, ?, ?)'
        ).run(businessId, new Date().toISOString(), type, message, phase);
    }

    getLogs(limit = 100) {
        return this.db.prepare(
            'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?'
        ).all(limit);
    }

    // --- Empire State Methods ---

    setEmpireState(key, value) {
        this.db.prepare(
            'INSERT OR REPLACE INTO empire_state (key, value) VALUES (?, ?)'
        ).run(key, JSON.stringify(value));
    }

    getEmpireState(key) {
        const row = this.db.prepare('SELECT value FROM empire_state WHERE key = ?').get(key);
        return row ? JSON.parse(row.value) : null;
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

export default Database;
