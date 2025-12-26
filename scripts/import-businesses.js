import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from '../packages/core/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const dataDir = path.join(__dirname, '..', 'data', 'businesses');
  if (!fs.existsSync(dataDir)) {
    console.error('No businesses directory:', dataDir);
    process.exit(1);
  }

  const db = new Database({ dbPath: path.join(__dirname, '..', 'data', 'king-ai.db') });
  await db.init();

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} business files in ${dataDir}`);

  let imported = 0;
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      const obj = JSON.parse(raw);

      // Map fields to DB-friendly shape
      const business = {
        id: obj.id || obj.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `b-${Date.now()}`,
        name: obj.name || obj.title || 'Untitled',
        idea: obj.idea || obj.description || null,
        analysis_id: obj.analysis_id || null,
        plan_id: obj.plan_id || null,
        status: obj.status || obj.state || 'active',
        started_at: obj.startedAt || obj.started_at || new Date().toISOString(),
        revenue: obj.revenue || obj.revenue_amount || 0,
        expenses: obj.expenses || 0,
        priority: obj.priority || 1.0,
        metadata: obj.metadata || obj,
      };

      await db.saveBusiness(business);
      imported++;
    } catch (e) {
      console.error('Failed to import', file, e.message);
    }
  }

  console.log(`Imported ${imported}/${files.length} businesses.`);
  await db.close();
}

main().catch(e => { console.error(e); process.exit(2); });
