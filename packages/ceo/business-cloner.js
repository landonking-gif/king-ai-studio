/**
 * Business Cloner - One-click clone of successful businesses to new niches
 * Duplicates everything: structure, content strategy, pricing, with niche adaptation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BusinessCloner {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/clones');
        this.ensureDataDir();
        this.modelRouter = config.modelRouter || new ModelRouter();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Clone a business to a new niche
     */
    async clone(sourceBusiness, targetNiche, options = {}) {
        console.log(`[Cloner] Cloning "${sourceBusiness.name}" to niche: ${targetNiche}`);

        const cloneId = `clone-${Date.now()}`;

        // Use AI to adapt elements to new niche
        const adaptationPrompt = `You are a business strategist. Adapt this successful business model to a new niche.

SOURCE BUSINESS:
Name: ${sourceBusiness.name}
Description: ${sourceBusiness.description}
Services/Products: ${JSON.stringify(sourceBusiness.services || sourceBusiness.products)}
Pricing: ${JSON.stringify(sourceBusiness.pricing)}
Content Topics: ${JSON.stringify(sourceBusiness.contentPlan?.topics)}

TARGET NICHE: ${targetNiche}

Adapt the following for the new niche:
1. New business name
2. Updated description
3. Adapted services/products with pricing
4. New content topics relevant to this niche
5. Target audience description
6. Key differentiators

Return as JSON:
{
  "name": "",
  "description": "",
  "services": [{"name": "", "price": 0, "type": ""}],
  "contentTopics": [],
  "targetAudience": "",
  "differentiators": [],
  "keywords": []
}`;

        const adaptation = await this.modelRouter.complete(adaptationPrompt, 'reasoning');

        let adaptedData;
        try {
            const jsonMatch = adaptation.content.match(/\{[\s\S]*\}/);
            adaptedData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (e) {
            adaptedData = { name: `${targetNiche} Business`, description: targetNiche };
        }

        // Create cloned business
        const clonedBusiness = {
            id: cloneId,
            originalId: sourceBusiness.id,
            clonedFrom: sourceBusiness.name,
            name: adaptedData.name || `${targetNiche} ${sourceBusiness.category}`,
            description: adaptedData.description,
            category: sourceBusiness.category,
            niche: targetNiche,

            // Preserved structure
            tasks: this.adaptTasks(sourceBusiness.tasks, targetNiche),

            // Adapted elements
            services: adaptedData.services || sourceBusiness.services,
            pricing: sourceBusiness.pricing,

            contentPlan: {
                ...sourceBusiness.contentPlan,
                topics: adaptedData.contentTopics || sourceBusiness.contentPlan?.topics
            },

            targetAudience: adaptedData.targetAudience,
            differentiators: adaptedData.differentiators,
            keywords: adaptedData.keywords,

            // Financials (from source)
            estimatedRevenue: sourceBusiness.estimatedRevenue,
            startupCost: sourceBusiness.startupCost,

            // Metadata
            createdAt: new Date().toISOString(),
            status: 'ready_to_launch'
        };

        // Save clone record
        const cloneFile = path.join(this.dataDir, `${cloneId}.json`);
        fs.writeFileSync(cloneFile, JSON.stringify(clonedBusiness, null, 2));

        console.log(`[Cloner] Clone created: ${clonedBusiness.name}`);

        return {
            success: true,
            clone: clonedBusiness,
            adaptation: adaptedData
        };
    }

    /**
     * Adapt tasks for new niche
     */
    adaptTasks(tasks, niche) {
        if (!tasks) return [];

        return tasks.map(task => ({
            ...task,
            title: task.title.replace(/\[NICHE\]/g, niche),
            niche
        }));
    }

    /**
     * Bulk clone to multiple niches
     */
    async bulkClone(sourceBusiness, niches, options = {}) {
        const results = [];

        for (const niche of niches) {
            try {
                const result = await this.clone(sourceBusiness, niche, options);
                results.push(result);

                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 1000));
            } catch (error) {
                results.push({ success: false, niche, error: error.message });
            }
        }

        return {
            success: true,
            total: niches.length,
            successful: results.filter(r => r.success).length,
            results
        };
    }

    /**
     * Find related niches for cloning
     */
    async suggestNiches(business, count = 10) {
        const prompt = `Given this successful business:
"${business.name}" - ${business.description}

Suggest ${count} related niches where the same business model could work.
Consider: adjacent markets, different demographics, vertical/horizontal expansion.

Return as JSON array: ["niche1", "niche2", ...]`;

        const result = await this.modelRouter.complete(prompt, 'fast');

        try {
            const jsonMatch = result.content.match(/\[[\s\S]*\]/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Get all clones
     */
    getAllClones() {
        const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
        return files.map(f =>
            JSON.parse(fs.readFileSync(path.join(this.dataDir, f), 'utf-8'))
        );
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'clone':
                return this.clone(task.data.business, task.data.niche, task.data.options);
            case 'bulk':
                return this.bulkClone(task.data.business, task.data.niches, task.data.options);
            case 'suggest':
                return this.suggestNiches(task.data.business, task.data.count);
            case 'list':
                return this.getAllClones();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default BusinessCloner;
