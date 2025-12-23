/**
 * Competitor Spy - Monitors competitors for changes
 * Tracks pricing, content updates, and potential vulnerabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CompetitorSpy {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/spy');
        this.ensureDataDir();
        this.modelRouter = config.modelRouter || new ModelRouter();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Track a competitor
     */
    async addCompetitor(businessId, competitorUrl) {
        const id = Buffer.from(competitorUrl).toString('base64').substring(0, 10);
        const competitor = {
            id,
            businessId, // My business that considers this a competitor
            url: competitorUrl,
            lastChecked: null,
            snapshot: null, // Last known state
            history: []
        };

        const file = path.join(this.dataDir, 'competitors.json');
        let competitors = [];
        if (fs.existsSync(file)) competitors = JSON.parse(fs.readFileSync(file));
        
        if (!competitors.find(c => c.url === competitorUrl)) {
            competitors.push(competitor);
            fs.writeFileSync(file, JSON.stringify(competitors, null, 2));
        }

        return competitor;
    }

    /**
     * Check competitor for changes (simulated scrape)
     */
    async checkCompetitor(competitorUrl) {
        console.log(`[Spy] Checking ${competitorUrl}...`);
        
        // Here we would use Puppeteer/Fetch to get the page content
        // For now, I'll simulate "content extraction" passed to AI
        
        const mockPageContent = `
            Pricing: $29/mo (was $49/mo). 
            New Feature: AI Chatbot added.
            Blog: "How to use AI for marketing" posted yesterday.
        `;

        const prompt = `Analyze this competitor update.
URL: ${competitorUrl}
Content: ${mockPageContent}

Identify:
1. Pricing changes
2. New features
3. Content strategy shifts
4. Vulnerabilities (e.g., negative reviews context, broken links, slow site)

Return as JSON: {"changes": [], "vulnerabilities": [], "strategy_shift": ""}`;

        const analysis = await this.modelRouter.complete(prompt, 'reasoning');
        
        let result = {};
        try {
            const jsonMatch = analysis.content.match(/\{[\s\S]*\}/);
            result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (e) {}

        // Log history
        this.logHistory(competitorUrl, result);

        return result;
    }

    logHistory(url, analysis) {
        const file = path.join(this.dataDir, `history-${Buffer.from(url).toString('base64').substring(0,10)}.jsonl`);
        const entry = {
            timestamp: new Date().toISOString(),
            analysis
        };
        fs.appendFileSync(file, JSON.stringify(entry) + '\n');
    }

    async execute(task) {
        switch (task.action) {
            case 'add': return this.addCompetitor(task.data.businessId, task.data.url);
            case 'check': return this.checkCompetitor(task.data.url);
        }
    }
}
export default CompetitorSpy;
