/**
 * Autonomous CEO Demo - Build a Social Media Marketing Agency
 * This demonstrates the full power of the autonomous business builder
 * 
 * Run with: node demo-agency.js
 */

import 'dotenv/config';
import { AutonomousCEO } from './packages/ceo/autonomous-ceo.js';
import { socialMediaAgencyBlueprint } from './packages/blueprints/social-media-agency.js';

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     AUTONOMOUS CEO - Social Media Agency Builder         ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  This AI will build and run a complete business for you  ║');
    console.log('║  It will ask for approval on legal/financial decisions   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const ceo = new AutonomousCEO({
        recipientEmail: process.env.NOTIFICATION_EMAIL || 'landon.king@luxebuildmedia.com',
        gmailUser: process.env.GMAIL_USER,
        gmailPassword: process.env.GMAIL_APP_PASSWORD
    });

    console.log('📋 Business Blueprint: Social Media Marketing Agency\n');
    console.log('Phases to execute:');
    console.log('  1️⃣  Foundation - Legal setup, branding, business plan');
    console.log('  2️⃣  Infrastructure - Website, workflows, automation');
    console.log('  3️⃣  Lead Generation - Scraping, cold email campaigns');
    console.log('  4️⃣  Client Operations - Contracts, content, freelancers');
    console.log('  5️⃣  Growth - Analytics, optimization, scaling\n');

    console.log('🔒 Approval checkpoints:');
    socialMediaAgencyBlueprint.approvalCheckpoints.forEach(cp => {
        console.log(`   • ${cp}`);
    });

    console.log('\n💰 Budget controls:');
    console.log(`   Initial budget: $${socialMediaAgencyBlueprint.budgetControls.initialBudget}`);
    console.log(`   Auto-approve: Under $${socialMediaAgencyBlueprint.budgetControls.approvalThresholds.automatic}`);
    console.log(`   Escalate: Over $${socialMediaAgencyBlueprint.budgetControls.approvalThresholds.escalate}`);

    console.log('\n🚀 Starting autonomous business builder...\n');
    console.log('='.repeat(60));

    // Start the business
    const result = await ceo.startFromBlueprint(socialMediaAgencyBlueprint);

    if (result.success) {
        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Business initialization complete!\n');
        console.log('📊 Status:');
        console.log(`   Business: ${result.business.name}`);
        console.log(`   ID: ${result.business.id}`);

        const status = ceo.getStatus();
        console.log(`   Pending approvals: ${status.pendingApprovals.length}`);

        if (status.pendingApprovals.length > 0) {
            console.log('\n🔒 Pending Approvals:');
            status.pendingApprovals.forEach(a => {
                console.log(`   [${a.id}] ${a.title}`);
            });
        }

        console.log('\n📧 Check your email for:');
        console.log('   • Progress updates');
        console.log('   • Approval requests for legal/financial decisions');

        console.log('\n💡 Commands:');
        console.log('   ceo.approve("approval-id")  - Approve a pending request');
        console.log('   ceo.reject("approval-id", "reason")  - Reject a request');
        console.log('   ceo.getStatus()  - Get current status');

        // Export for interactive use
        global.ceo = ceo;
        global.status = status;
    } else {
        console.log('\n❌ Failed to start:', result.error);
    }
}

main().catch(console.error);
