
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data');

async function cleanData() {
    console.log('🧹 Starting Complete Data Cleanup...');

    // 1. Clean Directories
    const dirsToClean = [
        path.join(DATA_DIR, 'businesses'),
        path.join(DATA_DIR, 'ceo'),
        path.join(DATA_DIR, 'audit-logs'),
        path.join(DATA_DIR, 'logs'), // General logs
    ];

    const specificFiles = [
        path.join(DATA_DIR, 'pending-approvals.json'),
        path.join(DATA_DIR, 'empire-hub.json'), // Possible legacy file
    ];

    console.log('\n[1/3] Deleting File Logs...');

    // Delete files in directories
    for (const d of dirsToClean) {
        if (fs.existsSync(d)) {
            const files = fs.readdirSync(d);
            for (const f of files) {
                if (f.endsWith('.json') || f.endsWith('.jsonl') || f.endsWith('.log')) {
                    const fullPath = path.join(d, f);
                    try {
                        fs.unlinkSync(fullPath);
                        console.log(`   Deleted: ${d}/${f}`);
                    } catch (e) {
                        console.error(`   Error deleting ${f}: ${e.message}`);
                    }
                }
            }
        }
    }

    // Delete specific root files
    for (const f of specificFiles) {
        if (fs.existsSync(f)) {
            try {
                fs.unlinkSync(f);
                console.log(`   Deleted: ${path.basename(f)}`);
            } catch (e) {
                console.error(`   Error deleting ${path.basename(f)}: ${e.message}`);
            }
        }
    }

    // 2. Clear Database
    console.log('\n[2/3] Truncating Database Tables...');
    const dbPath = path.join(DATA_DIR, 'king-ai.db');

    if (fs.existsSync(dbPath)) {
        await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Cannot open database:', err.message);
                    return resolve(); // Skip
                }
            });

            const tables = ['businesses', 'tasks', 'approvals', 'logs', 'state'];
            let completed = 0;

            db.serialize(() => {
                // Disable foreign keys to allow truncate
                db.run('PRAGMA foreign_keys = OFF;');

                tables.forEach(table => {
                    db.run(`DELETE FROM ${table}`, (err) => {
                        if (err && !err.message.includes('no such table')) {
                            console.error(`   Error clearing ${table}:`, err.message);
                        } else {
                            console.log(`   Cleared table: ${table}`);
                        }
                        completed++;
                        if (completed === tables.length) {
                            db.close();
                            resolve();
                        }
                    });
                });
            });
        });
    } else {
        console.log('   Database file not found, skipping.');
    }

    console.log('\n[3/3] Cleanup Complete. System is fresh.');
}

cleanData();
