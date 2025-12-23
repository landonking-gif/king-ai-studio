/**
 * Sentiment Analysis - Brand monitoring and social listening
 * Tracks brand health across social platforms
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SentimentAnalysis {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/analytics');
        this.ensureDataDir();
        this.modelRouter = config.modelRouter || new ModelRouter();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Analyze brand sentiment from mentions
     */
    async analyzeBrand(brandName, mentions) {
        // mentions: [{ text: "Love this product", source: "twitter" }, ...]

        if (!mentions || mentions.length === 0) {
            return { score: 0, summary: 'No data' };
        }

        const prompt = `Analyze sentiment for brand "${brandName}" based on these mentions:
${mentions.map(m => `- ${m.text}`).join('\n').substring(0, 1000)}

Provide:
1. Overall Sentiment Score (-100 to +100)
2. Key Themes (Positive & Negative)
3. Crisis Alert? (Yes/No)

Return as JSON.`;

        const result = await this.modelRouter.complete(prompt, 'fast');
        let analysis = {};
        try {
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (e) { }

        const report = {
            brandName,
            timestamp: new Date().toISOString(),
            mentionCount: mentions.length,
            analysis
        };

        const file = path.join(this.dataDir, 'sentiment.jsonl');
        fs.appendFileSync(file, JSON.stringify(report) + '\n');

        return report;
    }

    async execute(task) {
        if (task.action === 'analyze') return this.analyzeBrand(task.data.brandName, task.data.mentions);
    }
}
export default SentimentAnalysis;
