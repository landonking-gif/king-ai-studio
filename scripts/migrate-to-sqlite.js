/**
 * Migration Script - JSON to SQLite
 * Migrates existing King AI Studio data to the new SQLite database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from '../packages/core/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

async function migrate() {
    console.log('🚀 Starting Data Migration: JSON → SQLite');

    const db = new Database();
    await db.init();

    // 1. Migrate Businesses
    const businessesDir = path.join(DATA_DIR, 'businesses');
    if (fs.existsSync(businessesDir)) {
        const files = fs.readdirSync(businessesDir);

        // Migrate Analyses (as businesses)
        const analysisFiles = files.filter(f => f.startsWith('analysis-') && f.endsWith('.json'));
        console.log(`   Found ${analysisFiles.length} analysis files.`);

        for (const file of analysisFiles) {
            try {
                const analysis = JSON.parse(fs.readFileSync(path.join(businessesDir, file), 'utf-8'));
                await db.saveBusiness({
                    id: analysis.id,
                    name: analysis.name || analysis.ideaDescription?.substring(0, 50),
                    idea: analysis.ideaDescription,
                    analysis_id: analysis.id,
                    plan_id: analysis.planId,
                    status: analysis.status,
                    started_at: analysis.createdAt,
                    ...analysis
                });
            } catch (e) {
                console.error(`   ❌ Failed to migrate analysis ${file}:`, e.message);
            }
        }

        // Migrate Tasks
        const taskFiles = files.filter(f => f.endsWith('-tasks.json'));
        console.log(`   Found ${taskFiles.length} task files.`);

        for (const file of taskFiles) {
            try {
                const tasks = JSON.parse(fs.readFileSync(path.join(businessesDir, file), 'utf-8'));
                for (const task of tasks) {
                    await db.saveTask({
                        id: task.id,
                        business_id: task.analysis_id || task.planId?.replace('plan-', 'analysis-'), // Heuristic mapping
                        plan_id: task.planId,
                        phase: task.phase,
                        name: task.name,
                        description: task.description,
                        automated: task.automated,
                        requires_approval: task.requiresApproval,
                        status: task.status,
                        result: task.result || null,
                        created_at: task.createdAt
                    });
                }
            } catch (e) {
                console.error(`   ❌ Failed to migrate tasks from ${file}:`, e.message);
            }
        }
    }

    // 2. Migrate Approvals
    const approvalsFile = path.join(DATA_DIR, 'ceo/pending-approvals.json');
    if (fs.existsSync(approvalsFile)) {
        try {
            const approvals = JSON.parse(fs.readFileSync(approvalsFile, 'utf-8'));
            console.log(`   Found ${approvals.length} approval requests.`);
            for (const app of approvals) {
                await db.saveApproval({
                    id: app.id,
                    task_id: app.task_id || app.taskId,
                    type: app.type,
                    title: app.title,
                    description: app.description,
                    amount: app.amount,
                    impact: app.impact,
                    recommendation: app.recommendation,
                    status: app.status,
                    created_at: app.createdAt || app.requestedAt,
                    decided_at: app.approvedAt || app.rejectedAt,
                    notes: app.notes || app.rejectionReason
                });
            }
        } catch (e) {
            console.error(`   ❌ Failed to migrate approvals:`, e.message);
        }
    }

    // 3. Migrate Logs (Generic)
    const logsFile = path.join(DATA_DIR, 'ceo/execution.jsonl');
    if (fs.existsSync(logsFile)) {
        const lines = fs.readFileSync(logsFile, 'utf-8').split('\n').filter(Boolean);
        console.log(`   Found ${lines.length} log entries.`);
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                await db.log(entry.business_id || entry.business, entry.type, entry.message, entry.phase);
            } catch (e) { }
        }
    }

    // 4. Migrate Empire State
    const stateFile = path.join(DATA_DIR, 'ceo/empire-state.json');
    if (fs.existsSync(stateFile)) {
        try {
            const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
            await db.setEmpireState('empire_config', state);
            console.log('   Migrated empire state.');
        } catch (e) { }
    }

    console.log('\n✅ Migration Complete! Data now resides in data/king-ai.db');
    await db.close();
}

migrate().catch(console.error);
