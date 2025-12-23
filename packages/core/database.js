/**
 * Database Module - PostgreSQL persistence for King AI Studio
 * Handles businesses, tasks, approvals, and logging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
    constructor(config = {}) {
        this.connectionString = config.connectionString || process.env.DATABASE_URL || 'postgresql://localhost:5432/king_ai';
        this.pool = null;
        this.queryCache = new Map(); // Simple in-memory cache for read queries
    }

    /**
     * Initialize the database and create tables
     */
    async init() {
        this.pool = new Pool({
            connectionString: this.connectionString,
        });

        await this.createTables();
        console.log(`[Database] Initialized with PostgreSQL`);
        return this;
    }

    /**
     * Create necessary tables if they don't exist
     */
    async createTables() {
        console.log('[Database] Creating tables (Schema V3)...');
        // Businesses table
        await this.pool.query(`
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
        await this.pool.query(`
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
                created_at TEXT,
                FOREIGN KEY(business_id) REFERENCES businesses(id)
            )
        `);

        // Approvals table
        await this.pool.query(`
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
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                business_id TEXT,
                timestamp TEXT,
                type TEXT,
                message TEXT,
                phase TEXT,
                FOREIGN KEY(business_id) REFERENCES businesses(id)
            )
        `);

        // Empire State
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS empire_state (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Negotiations table for ROI #2
        await this.pool.query(`
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
                // Check if column exists, if not ADD it. 
                // PostgreSQL supports IF NOT EXISTS for ADD COLUMN in some versions, but to be safe, use try/catch
                await this.pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ${col} REAL DEFAULT 0`);
            } catch (e) {
                if (e.message.indexOf('duplicate column') === -1) {
                    // Only log real errors, not "duplicate column"
                    console.error(`[Database] Migration warning for ${col}: ${e.message}`);
                }
            }
        }
    }

    // --- Business Methods ---

    async saveBusiness(business) {
        const { id, name, idea, analysis_id, plan_id, status, started_at, revenue, expenses, priority, ...metadata } = business;
        await this.pool.query(
            `INSERT INTO businesses (id, name, idea, analysis_id, plan_id, status, started_at, revenue, expenses, priority, metadata) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, idea = EXCLUDED.idea, analysis_id = EXCLUDED.analysis_id, plan_id = EXCLUDED.plan_id, 
             status = EXCLUDED.status, started_at = EXCLUDED.started_at, revenue = EXCLUDED.revenue, 
             expenses = EXCLUDED.expenses, priority = EXCLUDED.priority, metadata = EXCLUDED.metadata`,
            [id, name, idea, analysis_id, plan_id, status, started_at, revenue || 0, expenses || 0, priority || 1.0, JSON.stringify(metadata)]
        );
        // Invalidate cache
        this.queryCache.delete('all_businesses');
    }

    async getBusiness(id) {
        const result = await this.pool.query('SELECT * FROM businesses WHERE id = $1', [id]);
        const row = result.rows[0];
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
        const result = await this.pool.query('SELECT * FROM businesses');
        const rows = result.rows.map(row => ({ ...row, ...(row.metadata ? JSON.parse(row.metadata) : {}) }));
        this.queryCache.set(cacheKey, rows);
        return rows;
    }

    // --- Task Methods ---

    async saveTask(task) {
        const { id, business_id, plan_id, phase, name, description, automated, requires_approval, status, result, created_at } = task;
        await this.pool.query(
            `INSERT INTO tasks (id, business_id, plan_id, phase, name, description, automated, requires_approval, status, result, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET
             business_id = EXCLUDED.business_id, plan_id = EXCLUDED.plan_id, phase = EXCLUDED.phase, name = EXCLUDED.name, 
             description = EXCLUDED.description, automated = EXCLUDED.automated, requires_approval = EXCLUDED.requires_approval, 
             status = EXCLUDED.status, result = EXCLUDED.result, created_at = EXCLUDED.created_at`,
            [id, business_id, plan_id, phase, name, description, automated ? 1 : 0, requires_approval ? 1 : 0, status, JSON.stringify(result), created_at]
        );
    }

    async getTasksForBusiness(businessId) {
        const result = await this.pool.query('SELECT * FROM tasks WHERE business_id = $1', [businessId]);
        return result.rows.map(row => ({ ...row, result: row.result ? JSON.parse(row.result) : null }));
    }

    async getQueuedTasks() {
        const result = await this.pool.query("SELECT * FROM tasks WHERE status = 'queued' ORDER BY priority DESC");
        return result.rows.map(row => ({ ...row, result: row.result ? JSON.parse(row.result) : null }));
    }

    // --- Approval Methods ---

    async saveApproval(approval) {
        const { id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes } = approval;
        await this.pool.query(
            `INSERT INTO approvals (id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET
             task_id = EXCLUDED.task_id, type = EXCLUDED.type, title = EXCLUDED.title, description = EXCLUDED.description, 
             amount = EXCLUDED.amount, impact = EXCLUDED.impact, recommendation = EXCLUDED.recommendation, 
             status = EXCLUDED.status, created_at = EXCLUDED.created_at, decided_at = EXCLUDED.decided_at, notes = EXCLUDED.notes`,
            [id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes]
        );
    }

    async getPendingApprovals() {
        const result = await this.pool.query("SELECT * FROM approvals WHERE status = 'pending'");
        return result.rows;
    }

    // --- Logging Methods ---

    async log(businessId, type, message, phase = null) {
        await this.pool.query(
            'INSERT INTO logs (business_id, timestamp, type, message, phase) VALUES ($1, $2, $3, $4, $5)',
            [businessId, new Date().toISOString(), type, message, phase]
        );
    }

    // --- Empire State Methods ---

    async setEmpireState(key, value) {
        await this.pool.query(
            'INSERT INTO empire_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
            [key, JSON.stringify(value)]
        );
    }

    async getEmpireState(key) {
        const result = await this.pool.query('SELECT value FROM empire_state WHERE key = $1', [key]);
        const row = result.rows[0];
        return row ? JSON.parse(row.value) : null;
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}

export default Database;
