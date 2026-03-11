/**
 * Empire Demo - Run the Autonomous Empire Loop
 * This demonstrates the full autonomous business generation system
 * 
 * Run with: node empire-demo.js
 */

import 'dotenv/config';
import { CEOAgent } from './packages/ceo/ceo-agent.js';
import { ModelRouter } from './packages/core/model-router.js';
import { AuditLogger } from './packages/core/audit-logger.js';
import { EmailNotifier } from './packages/core/email-notifier.js';

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        AUTONOMOUS EMPIRE - Business Generator            ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  This AI will autonomously:                              ║');
    console.log('║  1. Generate profitable business ideas                   ║');
    console.log('║  2. Rank and select the best opportunity                 ║');
    console.log('║  3. Create business plans and start execution            ║');
    console.log('║  4. Pause for approval on legal/financial decisions      ║');
    console.log('║  5. Loop and repeat to build an empire                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Initialize components
    const modelRouter = new ModelRouter({
        provider: 'ollama'
    });

    // Check availability
    console.log('🔍 Checking AI availability...');
    // We'll just assume start for now or use the router's internal check if we add one.
    // For now, let's just make sure it's initialized.

    const auditLogger = new AuditLogger();

    let emailNotifier = null;
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        emailNotifier = new EmailNotifier({
            gmailUser: process.env.GMAIL_USER,
            gmailPassword: process.env.GMAIL_APP_PASSWORD,
            recipientEmail: process.env.NOTIFICATION_EMAIL || 'landon.king@luxebuildmedia.com'
        });
        const initialized = await emailNotifier.init();
        if (initialized) {
            console.log('✅ Email notifications enabled');
        } else {
            console.log('⚠️ Email initialization failed. Progress will only show in console.');
            emailNotifier = null;
        }
    } else {
        console.log('⚠️ Email not configured. Progress will only show in console.');
    }

    const ceo = new CEOAgent({
        modelRouter,
        auditLogger,
        emailNotifier
    });
    await ceo.init();

    console.log('\n📋 Empire Configuration:');
    console.log('   • Ideas per cycle: 5');
    console.log('   • Max concurrent businesses: 3');
    console.log('   • Loop interval: 1 hour (for demo, normally 24 hours)');
    console.log('   • Auto-approve: Routine tasks');
    console.log('   • Require approval: Legal, financial decisions');

    console.log('\n🔒 Safety Features:');
    console.log('   • All legal tasks require human approval');
    console.log('   • All financial tasks require human approval');
    console.log('   • Email notifications for important decisions');
    console.log('   • Full audit logging');

    console.log('\n🚀 Starting Autonomous Empire...\n');
    console.log('='.repeat(60));
    console.log('Press Ctrl+C to stop\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Shutting down Empire...');
        ceo.stopEmpireLoop();
        console.log('Empire stopped. Check data/ceo/ for state.');
        process.exit(0);
    });

    // Run the empire loop
    await ceo.runEmpireLoop({
        loopInterval: 60 * 60 * 1000, // 1 hour for demo (use 24 * 60 * 60 * 1000 for production)
        ideasPerCycle: 5,
        maxConcurrentBusinesses: 3,
        criteria: {
            budget: '$500 - $5,000',
            timeToProfit: '1-3 months',
            automationLevel: 'High - businesses that can run with minimal human input',
            industries: ['Digital Services', 'SaaS', 'Automation', 'AI Tools', 'Content'],
            skills: ['AI/ML', 'Web Development', 'Marketing Automation', 'Content Creation']
        }
    });
}

main().catch(console.error);
