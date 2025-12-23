/**
 * Module Registry - Tracks all available modules and their capabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ModuleRegistry {
    constructor(config = {}) {
        this.modulesDir = config.modulesDir || path.join(__dirname, '../modules');
        this.registryFile = config.registryFile || path.join(__dirname, '../../data/registry.json');
        this.registry = this.loadRegistry();
    }

    loadRegistry() {
        try {
            if (fs.existsSync(this.registryFile)) {
                return JSON.parse(fs.readFileSync(this.registryFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load registry:', error.message);
        }
        return { modules: [], lastScan: null };
    }

    saveRegistry() {
        const dir = path.dirname(this.registryFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.registryFile, JSON.stringify(this.registry, null, 2));
    }

    /**
     * Scan modules directory and update registry
     */
    async scan() {
        const modules = [];

        if (!fs.existsSync(this.modulesDir)) {
            return { modules: [], scanned: 0 };
        }

        const dirs = fs.readdirSync(this.modulesDir)
            .filter(f => fs.statSync(path.join(this.modulesDir, f)).isDirectory());

        for (const dir of dirs) {
            const indexPath = path.join(this.modulesDir, dir, 'index.js');

            if (fs.existsSync(indexPath)) {
                const moduleInfo = {
                    name: dir,
                    path: indexPath,
                    status: 'available',
                    lastScanned: new Date().toISOString()
                };

                // Try to extract metadata from the file
                try {
                    const content = fs.readFileSync(indexPath, 'utf-8');

                    // Extract description from JSDoc
                    const descMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+)/);
                    if (descMatch) {
                        moduleInfo.description = descMatch[1].trim();
                    }

                    // Extract class name
                    const classMatch = content.match(/export class (\w+)/);
                    if (classMatch) {
                        moduleInfo.className = classMatch[1];
                    }

                    // Count methods
                    const methodMatches = content.match(/async\s+\w+\s*\(/g);
                    moduleInfo.methodCount = methodMatches ? methodMatches.length : 0;
                } catch (err) {
                    moduleInfo.parseError = err.message;
                }

                modules.push(moduleInfo);
            }
        }

        this.registry.modules = modules;
        this.registry.lastScan = new Date().toISOString();
        this.saveRegistry();

        return { modules, scanned: modules.length };
    }

    /**
     * Get all registered modules
     */
    getAll() {
        return this.registry.modules;
    }

    /**
     * Get module by name
     */
    get(name) {
        return this.registry.modules.find(m => m.name === name);
    }

    /**
     * Check if a module exists
     */
    exists(name) {
        return this.registry.modules.some(m => m.name === name);
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'scan':
                return this.scan();
            case 'list':
                return this.getAll();
            case 'get':
                return this.get(task.data.name);
            case 'exists':
                return this.exists(task.data.name);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ModuleRegistry;
