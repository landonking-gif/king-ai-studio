/**
 * Test Writer Agent - Auto-generates tests for code
 * Part of the Builder Agents layer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIProvider } from '../core/ai-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TestWriterAgent {
    constructor(config = {}) {
        this.ai = config.aiProvider || new AIProvider(config);
        this.outputDir = config.outputDir || path.join(__dirname, '../../generated/tests');
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate unit tests for a module
     */
    async generateUnitTests(spec) {
        const { code, moduleName, framework } = spec;

        const prompt = `Generate comprehensive unit tests for this ${moduleName} module:

\`\`\`javascript
${code}
\`\`\`

Requirements:
1. Use ${framework || 'Node.js built-in test runner'}
2. Cover all public methods
3. Include edge cases
4. Test error handling
5. Use descriptive test names

Return ONLY the test code.`;

        const result = await this.ai.complete(prompt, 'coding');

        if (result.success) {
            const filename = `${moduleName.toLowerCase().replace(/\s+/g, '-')}.test.js`;
            const filePath = path.join(this.outputDir, filename);
            fs.writeFileSync(filePath, result.content);

            return {
                success: true,
                path: filePath,
                content: result.content
            };
        }

        return { success: false, error: result.error };
    }

    /**
     * Generate integration tests
     */
    async generateIntegrationTests(spec) {
        const { modules, interactions, framework } = spec;

        const prompt = `Generate integration tests for these module interactions:

Modules: ${modules.join(', ')}

Interactions to test:
${interactions.map(i => `- ${i}`).join('\n')}

Requirements:
1. Use ${framework || 'Node.js built-in test runner'}
2. Test complete workflows
3. Include setup/teardown
4. Mock external dependencies
5. Verify data flow between modules

Return ONLY the test code.`;

        return this.ai.complete(prompt, 'coding');
    }

    /**
     * Generate test cases from requirements
     */
    async generateTestCases(requirements) {
        const prompt = `Generate test cases for these requirements:

${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

For each requirement, provide:
1. Test case name
2. Setup steps
3. Action to perform
4. Expected result
5. Edge cases to consider

Format as JSON array.`;

        const result = await this.ai.complete(prompt, 'reasoning');

        if (result.success) {
            try {
                return {
                    success: true,
                    testCases: JSON.parse(result.content)
                };
            } catch {
                return {
                    success: true,
                    testCases: result.content
                };
            }
        }

        return { success: false, error: result.error };
    }

    /**
     * Generate test data/fixtures
     */
    async generateTestData(schema) {
        const prompt = `Generate realistic test data/fixtures for this schema:

${JSON.stringify(schema, null, 2)}

Requirements:
1. Generate 5-10 realistic examples
2. Include edge cases (empty strings, special characters, etc.)
3. Include valid and invalid examples
4. Use realistic values (not "test123")

Return as JSON array.`;

        const result = await this.ai.complete(prompt, 'coding');

        if (result.success) {
            try {
                return {
                    success: true,
                    data: JSON.parse(result.content)
                };
            } catch {
                return {
                    success: true,
                    data: result.content
                };
            }
        }

        return { success: false, error: result.error };
    }

    /**
     * Execute a task from the orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'generate_unit':
                return this.generateUnitTests(task.data);
            case 'generate_integration':
                return this.generateIntegrationTests(task.data);
            case 'generate_cases':
                return this.generateTestCases(task.data);
            case 'generate_data':
                return this.generateTestData(task.data);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default TestWriterAgent;
