
import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from '../packages/core/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Database - Initialization and Schema', async (t) => {
    const testDbPath = path.join(__dirname, 'test-db.db');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    const db = new Database({ dbPath: testDbPath });
    await db.init();

    const tables = await db.db.all("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);

    assert.ok(tableNames.includes('businesses'), 'Should have businesses table');
    assert.ok(tableNames.includes('tasks'), 'Should have tasks table');
    assert.ok(tableNames.includes('approvals'), 'Should have approvals table');

    await db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

test('Database - CRUD Operations', async (t) => {
    const testDbPath = path.join(__dirname, 'test-crud.db');
    const db = new Database({ dbPath: testDbPath });
    await db.init();

    const business = {
        id: 'test-biz-1',
        name: 'Test Biz',
        idea: 'Testing CRUD',
        status: 'active',
        started_at: new Date().toISOString()
    };

    await db.saveBusiness(business);
    const saved = await db.getBusiness('test-biz-1');
    assert.strictEqual(saved.name, 'Test Biz');

    await db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});
