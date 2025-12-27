/**
 * Database Module - SQLite persistence for King AI Studio
 * Handles businesses, tasks, approvals, and logging
 */

import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
  constructor(config) {
    this.dbPath = config?.dbPath
      ? path.join(__dirname, config.dbPath)
      : path.join(__dirname, '..', '..', 'data', 'king-ai.db');

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

  // Called by orchestrator.js
  async init() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.db.run('PRAGMA journal_mode = WAL');
        this.db.run('PRAGMA busy_timeout = 10000');
        this.createTables();
        console.log(`[Database] Initialized at ${this.dbPath}`);
        resolve(this);
      }, 200);
    });
  }

  createTables() {
    // Businesses table
    this.db.run(`CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT,
      idea TEXT,
      analysisid TEXT,
      planid TEXT,
      status TEXT,
      startedat TEXT,
      revenue REAL DEFAULT 0,
      expenses REAL DEFAULT 0,
      priority REAL DEFAULT 1.0,
      metadata TEXT
    )`);

    // Tasks table
    this.db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      businessid TEXT,
      planid TEXT,
      phase TEXT,
      name TEXT,
      description TEXT,
      automated INTEGER,
      requiresapproval INTEGER,
      status TEXT,
      result TEXT,
      priority REAL DEFAULT 0,
      createdat TEXT
    )`);

    // Approvals table
    this.db.run(`CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      taskid TEXT,
      type TEXT,
      title TEXT,
      description TEXT,
      amount REAL,
      impact INTEGER,
      recommendation TEXT,
      status TEXT,
      createdat TEXT
    )`);

    // Logs table
    this.db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      businessid TEXT,
      timestamp TEXT,
      type TEXT,
      message TEXT
    )`);
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
      this.db.all('SELECT * FROM businesses', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  saveBusiness(business) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO businesses 
        (id, name, idea, analysisid, planid, status, startedat, revenue, expenses, priority, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        [
          business.id,
          business.name,
          business.idea || '',
          business.analysisid || '',
          business.planid || '',
          business.status || 'active',
          business.startedat || new Date().toISOString(),
          business.revenue || 0,
          business.expenses || 0,
          business.priority || 1.0,
          JSON.stringify(business.metadata || {}),
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  log(businessId, type, message) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO logs (businessid, timestamp, type, message) VALUES (?, ?, ?, ?)',
        [businessId, new Date().toISOString(), type, message],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

export default Database;
