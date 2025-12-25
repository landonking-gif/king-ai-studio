
import { ModelRouter } from './packages/core/model-router.js';
import dotenv from 'dotenv';
dotenv.config();

async function testPriority() {
    console.log("🔍 Testing AI Model Prioritization...");
    console.log(`🔑 Gemini Key Present: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`🔗 Ollama URL: ${process.env.OLLAMA_URL}`);

    const router = new ModelRouter();

    // Test 1: Ask for 'reasoning' model (Should prefer Gemini Pro or similar)
    console.log("\n--- Test 1: Reasoning Task ---");
    const model1 = router.selectModel('reasoning');
    console.log(`Selected Model: ${model1}`);

    // Test 2: Attempt a completion to see if it actually connects
    console.log("\n--- Test 2: Connectivity Check (Gemini) ---");
    const result = await router.complete("Hello, are you online?", 'fast', { model: 'gemini:gemini-1.5-flash' });
    if (result.success) {
        console.log("✅ Gemini Success:", result.content.substring(0, 50) + "...");
    } else {
        console.log("❌ Gemini Failed:", result.error);
    }

    // Test 3: Fallback check
    console.log("\n--- Test 3: Fallback Check (AWS/Ollama) ---");
    const result2 = await router.complete("Hello from AWS check", 'fast', { model: 'ollama:llama3.1:8b' });
    if (result2.success) {
        console.log("✅ AWS/Ollama Success:", result2.content.substring(0, 50) + "...");
    } else {
        console.log("❌ AWS/Ollama Failed:", result2.error);
    }
}

testPriority();
