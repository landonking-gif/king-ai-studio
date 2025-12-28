/**
 * Learning Memory
 * Persists the history of self-improvement optimizations to avoid repeating failures
 * and to reinforce successful patterns.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LearningMemory {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/meta');
        this.memoryFile = path.join(this.dataDir, 'learning-memory.json');
        this.ensureDataDir();
        this.memory = this.loadMemory();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Load memory from disk
     */
    loadMemory() {
        if (fs.existsSync(this.memoryFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.memoryFile, 'utf-8'));
            } catch (e) {
                console.error('[LearningMemory] Failed to load memory:', e);
            }
        }
        return {
            optimizations: [], // List of { file, optimization, result, score, timestamp }
            fileScores: {},    // Map of file paths to stability scores (0-100)
            patterns: []       // Learned successful patterns
        };
    }

    /**
     * Save memory to disk
     */
    saveMemory() {
        try {
            fs.writeFileSync(this.memoryFile, JSON.stringify(this.memory, null, 2));
        } catch (e) {
            console.error('[LearningMemory] Failed to save memory:', e);
        }
    }

    /**
     * Record an optimization attempt
     */
    recordAttempt(filePath, type, success, details) {
        const entry = {
            file: path.basename(filePath),
            type,
            success,
            details,
            timestamp: Date.now()
        };

        this.memory.optimizations.push(entry);

        // Update file score
        const key = path.basename(filePath);
        if (!this.memory.fileScores[key]) this.memory.fileScores[key] = 50; // Start at neutral

        if (success) {
            this.memory.fileScores[key] = Math.min(100, this.memory.fileScores[key] + 5);
        } else {
            this.memory.fileScores[key] = Math.max(0, this.memory.fileScores[key] - 10);
        }

        // Keep memory size manageable
        if (this.memory.optimizations.length > 500) {
            this.memory.optimizations = this.memory.optimizations.slice(-500);
        }

        this.saveMemory();
    }

    /**
     * Get recent failures for a file to include in prompt context
     */
    getRecentFailures(filePath) {
        const fileName = path.basename(filePath);
        return this.memory.optimizations
            .filter(o => o.file === fileName && !o.success)
            .slice(-3)
            .map(o => o.details);
    }

    /**
     * Check if a file is too unstable to touch
     */
    isUnstable(filePath) {
        const key = path.basename(filePath);
        return (this.memory.fileScores[key] || 50) < 20;
    }
}
