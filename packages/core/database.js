/**
 * Database Module - SQLite persistence for King AI Studio
 * Handles businesses, tasks, approvals, and logging
 */

import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

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
    async init() {
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });

        await this.createTables();
        console.log(`[Database] Initialized at ${this.dbPath}`);
        return this;
    }

    /**
     * Create necessary tables if they don't exist
     */
    async createTables() {
        // Businesses table
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS empire_state (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Negotiations table for ROI #2
        await this.db.exec(`
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
                await this.db.exec(`ALTER TABLE businesses ADD COLUMN ${col} REAL DEFAULT 0`);
            } catch (e) {
                // Ignore if column already exists
            }
        }

        // Migration for tasks.priority
        try {
            await this.db.exec(`ALTER TABLE tasks ADD COLUMN priority REAL DEFAULT 0`);
        } catch (e) {
            // Ignore
        }

        // Ensure 'system' business exists
        await this.db.run(`
            INSERT OR IGNORE INTO businesses (id, name, idea, status, started_at)
            VALUES (?, ?, ?, ?, ?)
        `, ['system', 'System', 'System Operations', 'active', new Date().toISOString()]);
    }

    // --- Business Methods ---

    async saveBusiness(business) {
        const { id, name, idea, analysis_id, plan_id, status, started_at, revenue, expenses, priority, ...metadata } = business;
        await this.db.run(
            `INSERT OR REPLACE INTO businesses (id, name, idea, analysis_id, plan_id, status, started_at, revenue, expenses, priority, metadata) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, idea, analysis_id, plan_id, status, started_at, revenue || 0, expenses || 0, priority || 1.0, JSON.stringify(metadata)]
        );
        this.queryCache.delete('all_businesses');
    }

    async getBusiness(id) {
        const row = await this.db.get('SELECT * FROM businesses WHERE id = ?', [id]);
        if (row && row.metadata) {
            return { ...row, ...JSON.parse(row.metadata) };
        }
        return row;
    }

    async getAllBusinesses() {
        const cacheKey = 'all_businesses';
        if (this.queryCache.has(cacheKey)) {
            return this.queryCache.get(cacheKey);
        }
        const rows = await this.db.all('SELECT * FROM businesses');
        const results = rows.map(row => ({ ...row, ...(row.metadata ? JSON.parse(row.metadata) : {}) }));
        this.queryCache.set(cacheKey, results);
        return results;
    }

    // --- Task Methods ---

    async saveTask(task) {
        const { id, business_id, plan_id, phase, name, description, automated, requires_approval, status, result, priority, created_at } = task;
        await this.db.run(
            `INSERT OR REPLACE INTO tasks (id, business_id, plan_id, phase, name, description, automated, requires_approval, status, result, priority, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, business_id, plan_id, phase, name, description, automated ? 1 : 0, requires_approval ? 1 : 0, status, JSON.stringify(result), priority || 0, created_at]
        );
    }

    async getTasksForBusiness(businessId) {
        const rows = await this.db.all('SELECT * FROM tasks WHERE business_id = ?', [businessId]);
        return rows.map(row => ({ ...row, result: row.result ? JSON.parse(row.result) : null }));
    }

    async getQueuedTasks() {
        const rows = await this.db.all("SELECT * FROM tasks WHERE status = 'queued' ORDER BY priority DESC");
        return rows.map(row => ({ ...row, result: row.result ? JSON.parse(row.result) : null }));
    }

    // --- Approval Methods ---

    async saveApproval(approval) {
        const { id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes } = approval;
        await this.db.run(
            `INSERT OR REPLACE INTO approvals (id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes]
        );
    }

    async getPendingApprovals() {
        return await this.db.all("SELECT * FROM approvals WHERE status = 'pending'");
    }

    // --- Logging Methods ---

    async log(businessId, type, message, phase = null) {
        await this.db.run(
            'INSERT INTO logs (business_id, timestamp, type, message, phase) VALUES (?, ?, ?, ?, ?)',
            [businessId, new Date().toISOString(), type, message, phase]
        );
    }

    async getLogs(limit = 100) {
        return await this.db.all(
            'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?',
            [limit]
        );
    }

    // --- Empire State Methods ---

    async setEmpireState(key, value) {
        await this.db.run(
            'INSERT OR REPLACE INTO empire_state (key, value) VALUES (?, ?)',
            [key, JSON.stringify(value)]
        );
    }

    async getEmpireState(key) {
        const row = await this.db.get('SELECT value FROM empire_state WHERE key = ?', [key]);
        return row ? JSON.parse(row.value) : null;
    }

    async close() {
        if (this.db) {
            await this.db.close();
        }
    }
}

export default Database;
