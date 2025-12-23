/**
 * Code Generator Agent - Generates code based on specifications
 * Part of the Builder Agents layer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIProvider } from '../core/ai-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CodeGeneratorAgent {
    constructor(config = {}) {
        this.ai = config.aiProvider || new AIProvider(config);
        this.outputDir = config.outputDir || path.join(__dirname, '../../generated/code');
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate a module/class based on specification
     */
    async generateModule(spec) {
        const { name, language, description, methods, dependencies } = spec;

        const prompt = `Generate a ${language} module with the following specification:

Module Name: ${name}
Description: ${description}

Methods to implement:
${methods.map(m => `- ${m.name}: ${m.description}`).join('\n')}

${dependencies ? `Dependencies: ${dependencies.join(', ')}` : ''}

Requirements:
1. Follow ${language} best practices
2. Include JSDoc/docstrings
3. Handle errors properly
4. Make it production-ready
5. Use ES modules (import/export)

Return ONLY the code, no explanations.`;

        const result = await this.ai.complete(prompt, 'coding');

        if (result.success) {
            const ext = language === 'javascript' ? '.js' : language === 'typescript' ? '.ts' : '.py';
            const filename = `${name.toLowerCase().replace(/\s+/g, '-')}${ext}`;
            const filePath = path.join(this.outputDir, filename);

            fs.writeFileSync(filePath, result.content);

            return {
                success: true,
                path: filePath,
                content: result.content,
                model: result.model
            };
        }

        return { success: false, error: result.error };
    }

    /**
     * Generate a function
     */
    async generateFunction(spec) {
        const { name, description, parameters, returns, language } = spec;

        const paramStr = parameters
            .map(p => `${p.name}: ${p.type} - ${p.description}`)
            .join('\n');

        const prompt = `Generate a ${language || 'javascript'} function:

Function: ${name}
Description: ${description}

Parameters:
${paramStr}

Returns: ${returns}

Requirements:
1. Include complete JSDoc/docstrings
2. Handle edge cases
3. Be production-ready

Return ONLY the function code.`;

        return this.ai.complete(prompt, 'coding');
    }

    /**
     * Generate API endpoint handler
     */
    async generateAPIHandler(spec) {
        const { method, path, description, requestBody, response } = spec;

        const prompt = `Generate an Express.js API handler:

Endpoint: ${method} ${path}
Description: ${description}

${requestBody ? `Request Body: ${JSON.stringify(requestBody, null, 2)}` : ''}
Expected Response: ${JSON.stringify(response, null, 2)}

Requirements:
1. Validate input
2. Handle errors properly
3. Return appropriate status codes
4. Include comments

Return ONLY the handler code.`;

        return this.ai.complete(prompt, 'coding');
    }

    /**
     * Generate integration/glue code
     */
    async generateIntegration(spec) {
        const { sourceModule, targetModule, description, dataFlow } = spec;

        const prompt = `Generate integration code to connect two modules:

Source: ${sourceModule}
Target: ${targetModule}
Description: ${description}
Data Flow: ${dataFlow}

Requirements:
1. Handle data transformation
2. Include error handling
3. Make it reusable
4. Add logging for debugging

Return ONLY the integration code.`;

        return this.ai.complete(prompt, 'coding');
    }

    /**
     * Refactor existing code
     */
    async refactorCode(code, instructions) {
        const prompt = `Refactor the following code according to these instructions:

Instructions: ${instructions}

Original Code:
\`\`\`
${code}
\`\`\`

Requirements:
1. Maintain the same functionality
2. Improve code quality
3. Add comments where helpful
4. Follow best practices

Return ONLY the refactored code.`;

        return this.ai.complete(prompt, 'coding');
    }

    /**
     * Execute a task from the orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'generate_module':
                return this.generateModule(task.data);
            case 'generate_function':
                return this.generateFunction(task.data);
            case 'generate_api':
                return this.generateAPIHandler(task.data);
            case 'generate_integration':
                return this.generateIntegration(task.data);
            case 'refactor':
                return this.refactorCode(task.data.code, task.data.instructions);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default CodeGeneratorAgent;
