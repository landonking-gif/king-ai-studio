/**
 * King AI Studio - Main Entry Point
 * Self-expanding AI system with Autonomous CEO capabilities
 */

import 'dotenv/config';
import { Orchestrator } from './packages/orchestrator/index.js';
import { DocumentHub } from './packages/modules/document-hub/index.js';
import { ComplianceModule } from './packages/modules/compliance/index.js';
import { ContractsModule } from './packages/modules/contracts/index.js';
import { FinanceModule } from './packages/modules/finance/index.js';
import { SelfExpansionEngine } from './packages/expansion/self-expansion.js';
import { ModuleRegistry } from './packages/expansion/module-registry.js';
import { CEOAgent } from './packages/ceo/ceo-agent.js';

// Load environment configuration
const config = {
    // Email settings
    gmailUser: process.env.GMAIL_USER,
    gmailPassword: process.env.GMAIL_APP_PASSWORD,
    recipientEmail: process.env.NOTIFICATION_EMAIL || 'landon.king@luxebuildmedia.com',

    // Schedule settings
    hour: parseInt(process.env.DAILY_SUMMARY_HOUR) || 18,
    minute: parseInt(process.env.DAILY_SUMMARY_MINUTE) || 0,
    timezone: process.env.TIMEZONE || 'America/Chicago',

    // Policy settings
    defaultAutoApprove: process.env.AUTO_APPROVE_DEFAULT !== 'false'
};

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     King AI Studio - Autonomous CEO Mode       ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  Email: ${config.recipientEmail.padEnd(38)}║`);
    console.log(`║  Summary: ${config.hour}:${String(config.minute).padStart(2, '0')} ${config.timezone.padEnd(25)}║`);
    console.log('╚════════════════════════════════════════════════╝\n');

    // Initialize orchestrator
    const orchestrator = new Orchestrator(config);
    await orchestrator.init();

    // Register all business modules
    orchestrator.registerModule('document-hub', new DocumentHub());
    orchestrator.registerModule('compliance', new ComplianceModule());
    orchestrator.registerModule('contracts', new ContractsModule());
    orchestrator.registerModule('finance', new FinanceModule());

    // Register expansion capabilities
    const expansionEngine = new SelfExpansionEngine(config);
    const moduleRegistry = new ModuleRegistry();
    orchestrator.registerModule('expansion', expansionEngine);
    orchestrator.registerModule('registry', moduleRegistry);

    // Register CEO Agent
    const ceoAgent = new CEOAgent(config);
    await ceoAgent.init();
    orchestrator.registerModule('ceo', ceoAgent);

    // Start the system
    await orchestrator.start();

    // Scan modules
    const scanResult = await moduleRegistry.scan();
    console.log(`\n📦 Found ${scanResult.scanned} modules`);

    // Show system status
    const status = orchestrator.getStatus();
    console.log('\n🚀 System Status:');
    console.log(`   Modules: ${status.registeredModules.join(', ')}`);
    console.log(`   Today's actions: ${status.todaysSummary.totalActions}`);

    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down King AI Studio...');
        orchestrator.stop();
        process.exit(0);
    });

    console.log('\n✅ King AI Studio is running!');
    console.log('   🧠 Autonomous CEO Mode Active');
    console.log('   📧 Email notifications enabled');
    console.log('   🔒 Legal/Financial approvals enforced\n');

    // Export for interactive use
    global.orchestrator = orchestrator;
    global.ceo = ceoAgent;

    console.log('💡 Interactive commands available:');
    console.log('   global.ceo.startBusiness({ description: "Your idea" })');
    console.log('   global.ceo.getStatus()');
    console.log('   global.ceo.executePlan()');
}

main().catch(console.error);
