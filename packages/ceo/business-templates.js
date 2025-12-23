/**
 * Business Templates - Pre-built templates for rapid business creation
 * Includes SaaS, Agency, E-commerce, Content, Consulting, and more
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BusinessTemplates {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/templates');
        this.ensureDataDir();
        this.loadCustomTemplates();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadCustomTemplates() {
        const customFile = path.join(this.dataDir, 'custom-templates.json');
        if (fs.existsSync(customFile)) {
            this.customTemplates = JSON.parse(fs.readFileSync(customFile, 'utf-8'));
        } else {
            this.customTemplates = {};
        }
    }

    /**
     * All built-in business templates
     */
    templates = {
        // ═══════════════════════════════════════════════════════════════
        // SERVICE BUSINESSES
        // ═══════════════════════════════════════════════════════════════

        'digital-agency': {
            name: 'Digital Marketing Agency',
            category: 'service',
            description: 'Full-service digital marketing agency',
            estimatedRevenue: { min: 5000, max: 50000, period: 'month' },
            startupCost: { min: 500, max: 2000 },
            timeToProfit: '2-4 weeks',
            tasks: [
                { phase: 'setup', title: 'Create brand identity', type: 'creative', priority: 1 },
                { phase: 'setup', title: 'Build agency website', type: 'development', priority: 1 },
                { phase: 'setup', title: 'Set up service packages', type: 'planning', priority: 2 },
                { phase: 'setup', title: 'Create portfolio with case studies', type: 'content', priority: 2 },
                { phase: 'launch', title: 'Set up Stripe payments', type: 'financial', priority: 1 },
                { phase: 'launch', title: 'Create LinkedIn company page', type: 'social', priority: 2 },
                { phase: 'launch', title: 'Launch Twitter presence', type: 'social', priority: 2 },
                { phase: 'growth', title: 'Cold email outreach campaign', type: 'outreach', priority: 1 },
                { phase: 'growth', title: 'LinkedIn content strategy', type: 'content', priority: 2 },
                { phase: 'growth', title: 'Set up referral program', type: 'marketing', priority: 3 }
            ],
            services: [
                { name: 'Social Media Management', price: 1500, type: 'recurring' },
                { name: 'SEO Services', price: 2000, type: 'recurring' },
                { name: 'PPC Management', price: 1000, type: 'recurring' },
                { name: 'Website Design', price: 5000, type: 'one-time' },
                { name: 'Branding Package', price: 3000, type: 'one-time' }
            ],
            contentPlan: {
                platforms: ['linkedin', 'twitter', 'instagram'],
                frequency: { linkedin: 5, twitter: 14, instagram: 7 },
                topics: ['marketing tips', 'case studies', 'industry news', 'behind the scenes']
            }
        },

        'ai-writing-service': {
            name: 'AI Content Writing Service',
            category: 'service',
            description: 'AI-powered content creation for businesses',
            estimatedRevenue: { min: 3000, max: 20000, period: 'month' },
            startupCost: { min: 200, max: 500 },
            timeToProfit: '1-2 weeks',
            tasks: [
                { phase: 'setup', title: 'Create service website', type: 'development', priority: 1 },
                { phase: 'setup', title: 'Define content packages', type: 'planning', priority: 1 },
                { phase: 'setup', title: 'Set up content generation workflow', type: 'automation', priority: 1 },
                { phase: 'launch', title: 'Create sample portfolio', type: 'content', priority: 2 },
                { phase: 'launch', title: 'Set up payment processing', type: 'financial', priority: 1 },
                { phase: 'growth', title: 'Freelancer platform profiles', type: 'marketing', priority: 2 },
                { phase: 'growth', title: 'Cold outreach to content managers', type: 'outreach', priority: 1 }
            ],
            services: [
                { name: 'Blog Post (1000 words)', price: 50, type: 'per-piece' },
                { name: 'Monthly Blog Package (8 posts)', price: 300, type: 'recurring' },
                { name: 'Website Copy', price: 500, type: 'one-time' },
                { name: 'Email Sequence', price: 200, type: 'per-piece' }
            ],
            contentPlan: {
                platforms: ['twitter', 'linkedin'],
                frequency: { twitter: 21, linkedin: 7 },
                topics: ['writing tips', 'AI tools', 'content marketing ROI']
            }
        },

        'consulting': {
            name: 'Business Consulting',
            category: 'service',
            description: 'High-ticket business consulting services',
            estimatedRevenue: { min: 10000, max: 100000, period: 'month' },
            startupCost: { min: 500, max: 1500 },
            timeToProfit: '4-8 weeks',
            tasks: [
                { phase: 'setup', title: 'Define consulting methodology', type: 'planning', priority: 1 },
                { phase: 'setup', title: 'Create professional website', type: 'development', priority: 1 },
                { phase: 'setup', title: 'Build thought leadership content', type: 'content', priority: 2 },
                { phase: 'launch', title: 'LinkedIn optimization', type: 'social', priority: 1 },
                { phase: 'launch', title: 'Set up Calendly for bookings', type: 'automation', priority: 1 },
                { phase: 'growth', title: 'Podcast guest outreach', type: 'marketing', priority: 2 },
                { phase: 'growth', title: 'Speaking engagement applications', type: 'marketing', priority: 3 }
            ],
            services: [
                { name: 'Strategy Session (1 hour)', price: 500, type: 'one-time' },
                { name: 'Monthly Retainer', price: 5000, type: 'recurring' },
                { name: 'Full Transformation Package', price: 25000, type: 'one-time' }
            ],
            contentPlan: {
                platforms: ['linkedin', 'twitter'],
                frequency: { linkedin: 7, twitter: 14 },
                topics: ['business strategy', 'leadership', 'scaling', 'case studies']
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // SAAS BUSINESSES
        // ═══════════════════════════════════════════════════════════════

        'micro-saas': {
            name: 'Micro-SaaS Product',
            category: 'saas',
            description: 'Small, focused SaaS solving one problem',
            estimatedRevenue: { min: 1000, max: 10000, period: 'month' },
            startupCost: { min: 100, max: 500 },
            timeToProfit: '2-3 months',
            tasks: [
                { phase: 'setup', title: 'Validate idea with landing page', type: 'development', priority: 1 },
                { phase: 'setup', title: 'Build MVP', type: 'development', priority: 1 },
                { phase: 'setup', title: 'Set up authentication', type: 'development', priority: 2 },
                { phase: 'launch', title: 'Stripe subscription integration', type: 'financial', priority: 1 },
                { phase: 'launch', title: 'Launch on Product Hunt', type: 'marketing', priority: 1 },
                { phase: 'launch', title: 'Submit to SaaS directories', type: 'marketing', priority: 2 },
                { phase: 'growth', title: 'SEO content strategy', type: 'content', priority: 2 },
                { phase: 'growth', title: 'Integration partnerships', type: 'partnerships', priority: 3 }
            ],
            pricing: [
                { name: 'Starter', price: 9, type: 'monthly' },
                { name: 'Pro', price: 29, type: 'monthly' },
                { name: 'Team', price: 79, type: 'monthly' }
            ],
            contentPlan: {
                platforms: ['twitter', 'linkedin', 'producthunt'],
                frequency: { twitter: 14, linkedin: 3 },
                topics: ['building in public', 'product updates', 'user success stories']
            }
        },

        'ai-tool': {
            name: 'AI-Powered Tool',
            category: 'saas',
            description: 'AI tool for a specific use case',
            estimatedRevenue: { min: 2000, max: 30000, period: 'month' },
            startupCost: { min: 200, max: 1000 },
            timeToProfit: '1-2 months',
            tasks: [
                { phase: 'setup', title: 'Define AI use case', type: 'planning', priority: 1 },
                { phase: 'setup', title: 'Build AI wrapper/interface', type: 'development', priority: 1 },
                { phase: 'setup', title: 'Create landing page', type: 'development', priority: 2 },
                { phase: 'launch', title: 'Set up pay-per-use or subscription', type: 'financial', priority: 1 },
                { phase: 'launch', title: 'Launch announcement', type: 'marketing', priority: 1 },
                { phase: 'growth', title: 'YouTube demo videos', type: 'content', priority: 2 },
                { phase: 'growth', title: 'Influencer outreach', type: 'marketing', priority: 2 }
            ],
            pricing: [
                { name: 'Free Tier', price: 0, credits: 10, type: 'monthly' },
                { name: 'Basic', price: 19, credits: 100, type: 'monthly' },
                { name: 'Pro', price: 49, credits: 500, type: 'monthly' },
                { name: 'Unlimited', price: 99, type: 'monthly' }
            ],
            contentPlan: {
                platforms: ['twitter', 'youtube', 'tiktok'],
                frequency: { twitter: 21, youtube: 2 },
                topics: ['AI tips', 'use case demos', 'comparisons']
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // E-COMMERCE
        // ═══════════════════════════════════════════════════════════════

        'dropshipping': {
            name: 'Dropshipping Store',
            category: 'ecommerce',
            description: 'No-inventory e-commerce store',
            estimatedRevenue: { min: 2000, max: 50000, period: 'month' },
            startupCost: { min: 300, max: 1000 },
            timeToProfit: '2-4 weeks',
            tasks: [
                { phase: 'setup', title: 'Niche research', type: 'research', priority: 1 },
                { phase: 'setup', title: 'Find winning products', type: 'research', priority: 1 },
                { phase: 'setup', title: 'Set up Shopify store', type: 'development', priority: 1 },
                { phase: 'setup', title: 'Connect supplier (CJ, Spocket)', type: 'operations', priority: 2 },
                { phase: 'launch', title: 'Product photography/videos', type: 'creative', priority: 2 },
                { phase: 'launch', title: 'Set up Facebook Pixel', type: 'marketing', priority: 1 },
                { phase: 'growth', title: 'Facebook/Instagram ads', type: 'advertising', priority: 1 },
                { phase: 'growth', title: 'TikTok organic content', type: 'content', priority: 2 },
                { phase: 'growth', title: 'Email marketing sequences', type: 'marketing', priority: 2 }
            ],
            products: 'Dynamic - based on trend research',
            contentPlan: {
                platforms: ['tiktok', 'instagram', 'facebook'],
                frequency: { tiktok: 21, instagram: 14 },
                topics: ['product demos', 'unboxings', 'customer reviews']
            }
        },

        'print-on-demand': {
            name: 'Print on Demand Store',
            category: 'ecommerce',
            description: 'Custom merchandise with no inventory',
            estimatedRevenue: { min: 500, max: 10000, period: 'month' },
            startupCost: { min: 100, max: 300 },
            timeToProfit: '2-4 weeks',
            tasks: [
                { phase: 'setup', title: 'Define niche/audience', type: 'research', priority: 1 },
                { phase: 'setup', title: 'Create designs', type: 'creative', priority: 1 },
                { phase: 'setup', title: 'Set up Printful/Printify', type: 'operations', priority: 1 },
                { phase: 'setup', title: 'Create store (Etsy or Shopify)', type: 'development', priority: 2 },
                { phase: 'launch', title: 'List initial products', type: 'operations', priority: 1 },
                { phase: 'growth', title: 'SEO optimization', type: 'marketing', priority: 2 },
                { phase: 'growth', title: 'Pinterest marketing', type: 'content', priority: 2 }
            ],
            products: 'Dynamic - based on designs',
            contentPlan: {
                platforms: ['pinterest', 'instagram', 'tiktok'],
                frequency: { pinterest: 30, instagram: 7 },
                topics: ['design process', 'product showcases', 'customer photos']
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // CONTENT/CREATOR
        // ═══════════════════════════════════════════════════════════════

        'newsletter': {
            name: 'Paid Newsletter',
            category: 'content',
            description: 'Premium content newsletter',
            estimatedRevenue: { min: 1000, max: 20000, period: 'month' },
            startupCost: { min: 50, max: 200 },
            timeToProfit: '4-8 weeks',
            tasks: [
                { phase: 'setup', title: 'Define newsletter niche', type: 'planning', priority: 1 },
                { phase: 'setup', title: 'Set up Substack/Beehiiv', type: 'development', priority: 1 },
                { phase: 'setup', title: 'Create welcome sequence', type: 'content', priority: 2 },
                { phase: 'launch', title: 'Launch with free content', type: 'content', priority: 1 },
                { phase: 'launch', title: 'Social media promotion', type: 'marketing', priority: 2 },
                { phase: 'growth', title: 'Guest posts for growth', type: 'marketing', priority: 2 },
                { phase: 'growth', title: 'Enable paid tier', type: 'financial', priority: 1 },
                { phase: 'growth', title: 'Sponsor outreach', type: 'partnerships', priority: 3 }
            ],
            pricing: [
                { name: 'Free', price: 0, type: 'monthly' },
                { name: 'Premium', price: 10, type: 'monthly' },
                { name: 'Premium Annual', price: 100, type: 'yearly' }
            ],
            contentPlan: {
                platforms: ['twitter', 'linkedin'],
                frequency: { twitter: 21, linkedin: 5 },
                topics: ['newsletter excerpts', 'industry insights', 'personal takes']
            }
        },

        'digital-products': {
            name: 'Digital Products',
            category: 'content',
            description: 'E-books, courses, templates',
            estimatedRevenue: { min: 500, max: 15000, period: 'month' },
            startupCost: { min: 100, max: 500 },
            timeToProfit: '2-6 weeks',
            tasks: [
                { phase: 'setup', title: 'Identify product type', type: 'planning', priority: 1 },
                { phase: 'setup', title: 'Create the product', type: 'creative', priority: 1 },
                { phase: 'setup', title: 'Set up Gumroad/Lemon Squeezy', type: 'development', priority: 2 },
                { phase: 'launch', title: 'Create sales page', type: 'development', priority: 1 },
                { phase: 'launch', title: 'Launch promotion', type: 'marketing', priority: 1 },
                { phase: 'growth', title: 'Affiliate program', type: 'partnerships', priority: 2 },
                { phase: 'growth', title: 'Content marketing', type: 'content', priority: 2 }
            ],
            pricing: 'Variable - $19 to $997 depending on product',
            contentPlan: {
                platforms: ['twitter', 'youtube', 'linkedin'],
                frequency: { twitter: 14, linkedin: 3 },
                topics: ['free value', 'testimonials', 'behind the scenes']
            }
        }
    };

    /**
     * Get all templates
     */
    getAll() {
        return { ...this.templates, ...this.customTemplates };
    }

    /**
     * Get template by ID
     */
    get(templateId) {
        return this.templates[templateId] || this.customTemplates[templateId];
    }

    /**
     * Get templates by category
     */
    getByCategory(category) {
        const all = this.getAll();
        return Object.entries(all)
            .filter(([_, t]) => t.category === category)
            .map(([id, template]) => ({ id, ...template }));
    }

    /**
     * Create custom template from existing business
     */
    saveAsTemplate(templateId, template) {
        this.customTemplates[templateId] = {
            ...template,
            isCustom: true,
            createdAt: new Date().toISOString()
        };

        const customFile = path.join(this.dataDir, 'custom-templates.json');
        fs.writeFileSync(customFile, JSON.stringify(this.customTemplates, null, 2));

        return this.customTemplates[templateId];
    }

    /**
     * Clone a successful business as template
     */
    cloneAsTemplate(business, newName) {
        const templateId = newName.toLowerCase().replace(/\s+/g, '-');

        return this.saveAsTemplate(templateId, {
            name: newName,
            category: business.category || 'custom',
            description: `Cloned from successful business: ${business.name}`,
            estimatedRevenue: business.revenue || { min: 0, max: 0 },
            startupCost: business.costs || { min: 0, max: 0 },
            tasks: business.tasks || [],
            services: business.services || [],
            pricing: business.pricing || [],
            contentPlan: business.contentPlan || {},
            clonedFrom: business.id
        });
    }

    /**
     * Get template recommendations based on criteria
     */
    recommend(criteria = {}) {
        const all = this.getAll();
        let ranked = Object.entries(all).map(([id, template]) => {
            let score = 0;

            // Budget match
            if (criteria.maxBudget) {
                if (template.startupCost.max <= criteria.maxBudget) {
                    score += 10;
                }
            }

            // Revenue goal match
            if (criteria.revenueGoal) {
                if (template.estimatedRevenue.max >= criteria.revenueGoal) {
                    score += 10;
                }
            }

            // Time preference
            if (criteria.fastLaunch && template.timeToProfit.includes('week')) {
                score += 5;
            }

            // Category preference
            if (criteria.category && template.category === criteria.category) {
                score += 15;
            }

            // Skills match
            if (criteria.skills) {
                const hasMatchingTasks = template.tasks?.some(t =>
                    criteria.skills.includes(t.type)
                );
                if (hasMatchingTasks) score += 5;
            }

            return { id, template, score };
        });

        return ranked
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'list':
                return this.getAll();
            case 'get':
                return this.get(task.data.templateId);
            case 'category':
                return this.getByCategory(task.data.category);
            case 'recommend':
                return this.recommend(task.data.criteria);
            case 'save':
                return this.saveAsTemplate(task.data.id, task.data.template);
            case 'clone':
                return this.cloneAsTemplate(task.data.business, task.data.name);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default BusinessTemplates;
