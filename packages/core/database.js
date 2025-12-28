/**
 * Database Module - SQLite persistence for King AI Studio
 * Handles businesses, tasks, approvals, and logging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
  constructor(config = {}) {
    this.dbPath = config?.dbPath
      ? path.isAbsolute(config.dbPath) ? config.dbPath : path.join(__dirname, config.dbPath)
      : path.join(__dirname, '..', '..', 'data', 'king-ai.db');

    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new sqlite3.Database(
      this.dbPath,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          console.error('Database connection failed:', err);
          return;
        }
        console.log(`Database connected at ${this.dbPath}`);
      }
    );
  }

  // Called by orchestrator.js or ApprovalServer
  async init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        try {
          this.db.run('PRAGMA journal_mode = WAL');
          this.db.run('PRAGMA busy_timeout = 10000');

          this.createTables((err) => {
            if (err) {
              console.error('[Database] Failed to create tables:', err);
              reject(err);
            } else {
              console.log(`[Database] Initialized at ${this.dbPath}`);
              resolve(this);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  createTables(callback) {
    this.db.serialize(() => {
      // Businesses table
      this.db.run(`CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT,
        idea TEXT,
        industry TEXT,
        current_phase TEXT,
        progress INTEGER DEFAULT 0,
        last_action TEXT,
        analysis_id TEXT,
        plan_id TEXT,
        status TEXT,
        started_at TEXT,
        revenue REAL DEFAULT 0,
        expenses REAL DEFAULT 0,
        priority REAL DEFAULT 1.0,
        metadata TEXT
      )`);

      // Tasks table
      this.db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        business_id TEXT,
        plan_id TEXT,
        phase TEXT,
        name TEXT,
        description TEXT,
        progress INTEGER DEFAULT 0,
        automated INTEGER,
        requires_approval INTEGER,
        status TEXT,
        result TEXT,
        priority REAL DEFAULT 0,
        created_at TEXT
      )`);

      // Approvals table
      this.db.run(`CREATE TABLE IF NOT EXISTS approvals (
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
        notes TEXT
      )`);

      // Logs table
      this.db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id TEXT,
      timestamp TEXT,
      type TEXT,
      message TEXT,
      phase TEXT,
      level TEXT,
      progress INTEGER DEFAULT 0
    )`, (err) => {
        if (!err) {
          // Double check for missing column (for existing tables)
          this.db.run("ALTER TABLE logs ADD COLUMN progress INTEGER DEFAULT 0", (alterErr) => {
            // Ignore if column already exists
          });
        }
      });

      // Key-Value store for state
      this.db.run(`CREATE TABLE IF NOT EXISTS state (
        key TEXT PRIMARY KEY,
        value TEXT
      )`, callback);
    });
  }

  getQueuedTasks() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM tasks WHERE status = 'queued' ORDER BY priority DESC",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getAllBusinesses() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM businesses ORDER BY started_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getAllTasks(limit = 500) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  saveBusiness(business) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO businesses 
        (id, name, idea, industry, current_phase, progress, last_action, analysis_id, plan_id, status, started_at, revenue, expenses, priority, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        [
          business.id || business.analysis_id || `bus-${Date.now()}`,
          business.name,
          business.idea || '',
          business.industry || '',
          business.current_phase || business.currentPhase || '',
          business.progress || 0,
          business.last_action || business.lastAction || '',
          business.analysis_id || business.analysisid || '',
          business.plan_id || business.planid || '',
          business.status || 'active',
          business.started_at || business.startedat || new Date().toISOString(),
          business.revenue || 0,
          business.expenses || 0,
          business.priority || 1.0,
          JSON.stringify(business.metadata || business),
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: business.id });
        }
      );
    });
  }

  saveTask(task) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO tasks 
        (id, business_id, plan_id, phase, name, description, progress, automated, requires_approval, status, result, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        [
          task.id,
          task.business_id || task.businessid,
          task.plan_id || task.planid,
          task.phase,
          task.name,
          task.description,
          task.progress || 0,
          task.automated ? 1 : 0,
          task.requires_approval || task.requires_approval ? 1 : 0,
          task.status,
          task.result ? JSON.stringify(task.result) : null,
          task.created_at || task.createdat || new Date().toISOString()
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: task.id });
        }
      );
    });
  }

  saveApproval(app) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO approvals 
        (id, task_id, type, title, description, amount, impact, recommendation, status, created_at, decided_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        [
          app.id,
          app.task_id || app.taskid,
          app.type,
          app.title,
          app.description,
          app.amount,
          app.impact,
          app.recommendation,
          app.status,
          app.created_at || app.createdat || new Date().toISOString(),
          app.decided_at || app.decidedat,
          app.notes
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: app.id });
        }
      );
    });
  }

  getPendingApprovals() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at DESC", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getApproval(id, status = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM approvals WHERE id = ?';
      let params = [id];
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getLogs(limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  log(business_id, type, message, phase = null, level = 'info', progress = 0) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO logs (business_id, timestamp, type, message, phase, level, progress) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [business_id, new Date().toISOString(), type, message, phase, level, progress],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  setEmpireState(key, value) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)',
        [key, JSON.stringify(value)],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  getEmpireState(key) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT value FROM state WHERE key = ?', [key], (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.value) : null);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default Database;
