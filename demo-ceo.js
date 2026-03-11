/**
 * CEO Demo - Test the Autonomous CEO with a business idea
 * Run with: node demo-ceo.js
 */

import 'dotenv/config';
import CEOAgent from './packages/ceo/ceo-agent.js';

const config = {
    gmailUser: process.env.GMAIL_USER,
    gmailPassword: process.env.GMAIL_APP_PASSWORD,
    recipientEmail: process.env.NOTIFICATION_EMAIL || 'landon.king@luxebuildmedia.com'
};

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║         CEO Agent Demo - Business Builder      ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    const ceo = new CEOAgent(config);
    await ceo.init();

    // Example business idea - replace with your idea
    const businessIdea = {
        description: 'A SaaS platform that uses AI to automatically generate and manage social media content for small businesses. Clients upload their brand guidelines and the AI creates daily posts, responds to comments, and provides analytics.',
        industry: 'Marketing Technology',
        targetMarket: 'Small businesses with 1-50 employees',
        budget: '$5,000 initial investment'
    };

    console.log('📝 Business Idea:');
    console.log(`   "${businessIdea.description}"\n`);

    // Step 1: Analyze and plan
    console.log('🚀 Starting business analysis and planning...\n');
    const result = await ceo.startBusiness(businessIdea);

    if (result.success) {
        console.log('\n✅ Business Analyzed & Planned!');
        console.log(`   Viability Score: ${result.analysis?.viability?.score}/10`);
        console.log(`   Total Tasks: ${result.tasks?.length}`);

        console.log('\n📋 Phases:');
        for (const phase of result.plan?.phases || []) {
            console.log(`   - ${phase.name}: ${phase.tasks?.length} tasks`);
        }

        console.log('\n🔒 Tasks Requiring Your Approval:');
        const approvalTasks = result.tasks?.filter(t => t.requiresApproval) || [];
        for (const task of approvalTasks.slice(0, 5)) {
            console.log(`   - ${task.name}`);
        }

        // Save for review
        console.log('\n💾 Full plan saved to: data/businesses/');
        console.log('\n📧 You will receive email notifications for:');
        console.log('   - Progress updates');
        console.log('   - Legal decisions requiring approval');
        console.log('   - Financial decisions requiring approval');

        // Ask about execution
        console.log('\n💡 To execute the plan, run:');
        console.log('   node -e "import(\'./packages/ceo/ceo-agent.js\').then(m => new m.CEOAgent().executePlan())"');
    } else {
        console.log('❌ Analysis failed:', result.error);
    }
}

main().catch(console.error);
