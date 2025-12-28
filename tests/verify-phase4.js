
import { ModelRouter } from '../packages/core/model-router.js';
import { CEOAgent } from '../packages/ceo/ceo-agent.js';
import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();

async function verify() {
    console.log('🧪 Starting Verification: Phase 4 Fixes & Features');

    // 1. Verify ModelRouter Prioritizes Ollama
    console.log('\n[1] Verifying ModelRouter Preference for Local Models...');
    const router = new ModelRouter();
    // Force reload of internal config if needed, but new instance should have updated code
    const reasoningModel = router.selectModel('reasoning');
    const fastModel = router.selectModel('fast');

    console.log(`   Reasoning Model Selected: ${reasoningModel}`);
    console.log(`   Fast Model Selected: ${fastModel}`);

    if (reasoningModel.startsWith('ollama')) {
        console.log('   ✅ ModelRouter correctly prioritizes Ollama for reasoning.');
    } else {
        console.error(`   ❌ ModelRouter FAILED: Expected ollama prefix, got ${reasoningModel}`);
        process.exit(1);
    }

    if (fastModel.startsWith('ollama')) {
        console.log('   ✅ ModelRouter correctly prioritizes Ollama for fast tasks.');
    } else {
        console.error(`   ❌ ModelRouter FAILED: Expected ollama prefix, got ${fastModel}`);
        process.exit(1);
    }


    // 2. Verify CEO Concurrency Limit
    console.log('\n[2] Verifying CEO Concurrency Limit...');
    const ceo = new CEOAgent({ modelRouter: router });

    // Mock Database
    ceo.db = {
        getAllBusinesses: async () => {
            return [
                { status: 'running' },
                { status: 'running' },
                { status: 'active' },
                { status: 'planned' },
                { status: 'starting' } // 5 active businesses
            ];
        },
        init: async () => { },
        log: async () => { }
    };

    // Mock Log Progress to avoid file writes/errors
    ceo.logProgress = async (msg) => { console.log(`   [CEO Log] ${msg}`); };

    process.env.MAX_CONCURRENT_BUSINESSES = '5';

    console.log('   Attempting to start business #6...');
    const result = await ceo.startBusiness({ description: 'Test Idea' });

    if (result.success === false && result.error === 'MAX_CONCURRENT_LIMIT_REACHED') {
        console.log('   ✅ CEO Agent correctly blocked new business creation due to concurrency limit.');
    } else {
        console.error('   ❌ CEO Agent FAILED to block business creation.', result);
        process.exit(1);
    }

    console.log('\n✅ ALL VERIFICATION TESTS PASSED');
    process.exit(0);
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
