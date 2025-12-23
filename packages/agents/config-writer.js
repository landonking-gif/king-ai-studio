/**
 * Config Writer Agent - Generates configuration files
 * Part of the Builder Agents layer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIProvider } from '../core/ai-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigWriterAgent {
    constructor(config = {}) {
        this.ai = config.aiProvider || new AIProvider(config);
        this.outputDir = config.outputDir || path.join(__dirname, '../../generated');
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate a configuration file based on description
     */
    async generateConfig(spec) {
        const { name, type, description, schema, outputPath } = spec;

        const prompt = `Generate a ${type} configuration file with the following requirements:

Name: ${name}
Description: ${description}
${schema ? `Schema/Structure: ${JSON.stringify(schema, null, 2)}` : ''}

Requirements:
1. Follow ${type} best practices
2. Include helpful comments
3. Use sensible defaults
4. Make it production-ready

Return ONLY the configuration content, no explanations.`;

        const result = await this.ai.complete(prompt, 'coding');

        if (result.success) {
            const filePath = outputPath || path.join(this.outputDir, name);
            fs.writeFileSync(filePath, result.content);

            return {
                success: true,
                path: filePath,
                content: result.content,
                model: result.model
            };
        }

        return {
            success: false,
            error: result.error
        };
    }

    /**
     * Generate environment file
     */
    async generateEnvFile(variables) {
        let content = '# Generated Environment Configuration\n';
        content += `# Generated: ${new Date().toISOString()}\n\n`;

        for (const [section, vars] of Object.entries(variables)) {
            content += `# ${section}\n`;
            for (const [key, value] of Object.entries(vars)) {
                content += `${key}=${value}\n`;
            }
            content += '\n';
        }

        return content;
    }

    /**
     * Generate Docker compose file
     */
    async generateDockerCompose(services) {
        const prompt = `Generate a Docker Compose file for these services:

${JSON.stringify(services, null, 2)}

Requirements:
1. Use latest best practices (version 3.8+)
2. Include health checks
3. Set up proper networking
4. Include volume mounts where appropriate
5. Use environment variables for configuration

Return ONLY the docker-compose.yml content.`;

        return this.ai.complete(prompt, 'coding');
    }

    /**
     * Generate package.json
     */
    async generatePackageJson(spec) {
        const { name, description, dependencies, scripts } = spec;

        const packageJson = {
            name: name.toLowerCase().replace(/\s+/g, '-'),
            version: '1.0.0',
            description: description || '',
            type: 'module',
            scripts: scripts || {
                start: 'node index.js',
                dev: 'node --watch index.js',
                test: 'node --test'
            },
            dependencies: dependencies || {},
            devDependencies: {}
        };

        return JSON.stringify(packageJson, null, 2);
    }

    /**
     * Execute a task from the orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'generate_config':
                return this.generateConfig(task.data);
            case 'generate_env':
                return this.generateEnvFile(task.data);
            case 'generate_docker':
                return this.generateDockerCompose(task.data);
            case 'generate_package':
                return this.generatePackageJson(task.data);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ConfigWriterAgent;
