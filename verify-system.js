import { Orchestrator } from './packages/orchestrator/index.js';
import { CEOAgent } from './packages/ceo/ceo-agent.js';
import { ModelRouter } from './packages/core/model-router.js';
import dotenv from 'dotenv';
dotenv.config();

async function verifySystem() {
    console.log('--- King AI Studio Verification ---');

    // 1. Initialize Model Router
    const router = new ModelRouter();
    console.log('Testing Model Router connectivity...');

    // Test with Ollama (fast)
    console.log('\nTesting Ollama (Fast/llama3.2:1b)...');
    const ollamaResult = await router.complete('Say "Ollama Fast OK"', 'fast');
    console.log('Ollama Result:', ollamaResult.success ? 'SUCCESS' : 'FAILED', ollamaResult.content || ollamaResult.error);

    // Test with Gemini (reasoning)
    console.log('\nTesting Gemini (Reasoning/2.0-pro)...');
    const geminiResult = await router.complete('Say "Gemini Reasoning OK"', 'reasoning');
    console.log('Gemini Result:', geminiResult.success ? 'SUCCESS' : 'FAILED', geminiResult.content || geminiResult.error);

    // 2. Test CEO Business Cycle
    console.log('\n--- Testing CEO Business Cycle ---');
    const ceo = new CEOAgent({ modelRouter: router });
    await ceo.init();

    const idea = { description: 'A dropshipping store for AI-generated wall art' };
    console.log(`Starting business for idea: ${idea.description}`);

    const result = await ceo.startBusiness(idea);
    if (result.success) {
        console.log('Success! Business Analyzed and Planned.');
        console.log('Business ID:', result.business.id);
        console.log('Viability Score:', result.analysis.viability.score);
    } else {
        console.error('Failed to start business:', result.error);
    }

    // 3. Test Empire Loop Components (Idea Gen & Ranking)
    console.log('\n--- Testing Empire Loop Heuristics ---');
    console.log('Testing Idea Generation...');
    const ideas = await ceo.businessAnalyzer.generateIdeas(3);
    console.log('Ideas Generated:', ideas.success ? `SUCCESS (${ideas.count})` : 'FAILED', ideas.success ? ideas.ideas[0].name : ideas.error);

    if (ideas.success) {
        console.log('Testing Idea Ranking...');
        const ranked = await ceo.businessAnalyzer.rankIdeas(ideas.ideas);
        console.log('Ranking Result:', ranked.success ? 'SUCCESS' : 'FAILED', ranked.success ? ranked.rankedIdeas[0].name : ranked.error);
        if (ranked.success && ranked.rankedIdeas[0].name) {
            console.log('✅ Simulation engine correctly provided a "name" for the top idea.');
        } else if (ranked.success) {
            console.log('❌ Simulation engine FAILED: missing name in ranked results.');
        }
    }

    process.exit(0);
}

verifySystem().catch(err => {
    console.error('Verification crashed:', err);
    process.exit(1);
});
