/**
 * Browser Worker Demo - Run the browser automation agent
 * This starts a worker that watches for task files and executes them
 * 
 * Run with: node demo-browser.js
 */

import 'dotenv/config';
import { BrowserWorker } from './packages/agents/browser-worker.js';

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           BROWSER WORKER - Automation Agent              ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  Watches for task files and executes browser actions     ║');
    console.log('║  Create tasks via ExternalToolsConnector.createBrowserTask║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const worker = new BrowserWorker({
        headless: false, // Set to true for production
        watchInterval: 3000 // Check every 3 seconds
    });

    console.log('📂 Watching directory: data/tools/');
    console.log('📋 Task format: {agent}-task.json with status: "pending"');
    console.log('');
    console.log('💡 To create a test task, run in another terminal:');
    console.log('   node -e "');
    console.log('   import fs from \'fs\';');
    console.log('   const task = {');
    console.log('     id: \'test-\' + Date.now(),');
    console.log('     status: \'pending\',');
    console.log('     steps: [');
    console.log('       { action: \'navigate\', url: \'https://example.com\' },');
    console.log('       { action: \'screenshot\', filename: \'test.png\' }');
    console.log('     ]');
    console.log('   };');
    console.log('   fs.writeFileSync(\'data/tools/test-task.json\', JSON.stringify(task, null, 2));');
    console.log('   "');
    console.log('');
    console.log('🚀 Starting browser worker...\n');
    console.log('Press Ctrl+C to stop\n');
    console.log('='.repeat(60));

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down...');
        worker.stopWatching();
        await worker.closeBrowser();
        process.exit(0);
    });

    // Start watching for tasks
    await worker.startWatching();
}

main().catch(console.error);
