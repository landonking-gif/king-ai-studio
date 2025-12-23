
import { BusinessAnalyzer } from './packages/ceo/business-analyzer.js';

async function testParser() {
    const analyzer = new BusinessAnalyzer();

    const testCases = [
        {
            name: 'Valid JSON',
            input: '{"key": "value"}',
            expected: { key: 'value' }
        },
        {
            name: 'Markdown JSON block',
            input: '```json\n{"key": "value"}\n```',
            expected: { key: 'value' }
        },
        {
            name: 'Text before and after JSON',
            input: 'Here is the result: {"key": "value"} Hope this helps!',
            expected: { key: 'value' }
        },
        {
            name: 'Array with text',
            input: 'The ideas are: [{"id": 1}, {"id": 2}] - end of list',
            expected: [{ id: 1 }, { id: 2 }]
        },
        {
            name: 'Nested JSON with markdown',
            input: 'Summary: \n```\n{\n  "nested": {"key": "val"}\n}\n```\nDone.',
            expected: { nested: { key: 'val' } }
        }
    ];

    console.log('🧪 Starting JSON Parser Tests...\n');

    let passed = 0;
    for (const tc of testCases) {
        try {
            const result = analyzer._parseJSON(tc.input);
            const passedTest = JSON.stringify(result) === JSON.stringify(tc.expected);

            if (passedTest) {
                console.log(`✅ [PASS] ${tc.name}`);
                passed++;
            } else {
                console.log(`❌ [FAIL] ${tc.name}`);
                console.log(`   Expected: ${JSON.stringify(tc.expected)}`);
                console.log(`   Got:      ${JSON.stringify(result)}`);
            }
        } catch (e) {
            console.log(`❌ [ERROR] ${tc.name}: ${e.message}`);
        }
    }

    console.log(`\n📊 Results: ${passed}/${testCases.length} passed.`);

    if (passed === testCases.length) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

testParser();
