/**
 * Cross-Sell Network - Sells between your own businesses
 * Maximizes customer LTV by routing clients between portfolio companies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CrossSellNetwork {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/cross-sell');
        this.ensureDataDir();
        this.loadNetwork();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadNetwork() {
        const networkFile = path.join(this.dataDir, 'network.json');
        if (fs.existsSync(networkFile)) {
            this.network = JSON.parse(fs.readFileSync(networkFile, 'utf-8'));
        } else {
            this.network = {
                businesses: {},
                relationships: [],
                offers: [],
                conversions: []
            };
        }
    }

    saveNetwork() {
        const networkFile = path.join(this.dataDir, 'network.json');
        fs.writeFileSync(networkFile, JSON.stringify(this.network, null, 2));
    }

    /**
     * Register a business in the network
     */
    registerBusiness(business) {
        this.network.businesses[business.id] = {
            id: business.id,
            name: business.name,
            category: business.category,
            services: business.services || [],
            customerTypes: business.customerTypes || [],
            averageOrderValue: business.averageOrderValue || 0,
            addedAt: new Date().toISOString()
        };
        this.saveNetwork();

        console.log(`[CrossSell] Registered: ${business.name}`);

        return this.network.businesses[business.id];
    }

    /**
     * Define a cross-sell relationship
     */
    createRelationship(fromBusinessId, toBusinessId, config = {}) {
        const relationship = {
            id: `rel-${Date.now()}`,
            from: fromBusinessId,
            to: toBusinessId,
            trigger: config.trigger || 'purchase', // purchase, signup, milestone
            timing: config.timing || 'immediate', // immediate, 7days, 30days
            offer: config.offer || null, // Special offer for cross-sell
            priority: config.priority || 5,
            active: true,
            createdAt: new Date().toISOString(),
            stats: {
                shown: 0,
                clicked: 0,
                converted: 0,
                revenue: 0
            }
        };

        this.network.relationships.push(relationship);
        this.saveNetwork();

        console.log(`[CrossSell] Relationship created: ${fromBusinessId} → ${toBusinessId}`);

        return relationship;
    }

    /**
     * Auto-detect cross-sell opportunities
     */
    autoDetectRelationships() {
        const businesses = Object.values(this.network.businesses);
        const suggestions = [];

        for (const biz1 of businesses) {
            for (const biz2 of businesses) {
                if (biz1.id === biz2.id) continue;

                // Check for complementary services
                const complementary = this.areComplementary(biz1, biz2);
                const sameAudience = this.haveSameAudience(biz1, biz2);

                if (complementary || sameAudience) {
                    suggestions.push({
                        from: biz1.id,
                        fromName: biz1.name,
                        to: biz2.id,
                        toName: biz2.name,
                        reason: complementary ? 'Complementary services' : 'Same target audience',
                        suggestedOffer: `Get 20% off ${biz2.name} as a ${biz1.name} customer`
                    });
                }
            }
        }

        return suggestions;
    }

    /**
     * Check if two businesses are complementary
     */
    areComplementary(biz1, biz2) {
        const complementaryPairs = {
            'service': ['saas', 'content', 'consulting'],
            'saas': ['service', 'consulting'],
            'ecommerce': ['content', 'service'],
            'content': ['service', 'saas', 'consulting'],
            'consulting': ['service', 'saas', 'content']
        };

        const matches = complementaryPairs[biz1.category] || [];
        return matches.includes(biz2.category);
    }

    /**
     * Check if two businesses target same audience
     */
    haveSameAudience(biz1, biz2) {
        const types1 = biz1.customerTypes || [];
        const types2 = biz2.customerTypes || [];
        return types1.some(t => types2.includes(t));
    }

    /**
     * Get cross-sell offers for a customer event
     */
    getOffers(businessId, event, customerData = {}) {
        const relevantRelationships = this.network.relationships.filter(r =>
            r.from === businessId &&
            r.trigger === event &&
            r.active
        );

        const offers = relevantRelationships.map(rel => {
            const toBusiness = this.network.businesses[rel.to];
            return {
                relationshipId: rel.id,
                businessId: rel.to,
                businessName: toBusiness?.name,
                offer: rel.offer || `Special offer for ${toBusiness?.name}`,
                timing: rel.timing,
                priority: rel.priority
            };
        });

        // Sort by priority
        offers.sort((a, b) => a.priority - b.priority);

        // Record impressions
        for (const rel of relevantRelationships) {
            rel.stats.shown++;
        }
        this.saveNetwork();

        return offers;
    }

    /**
     * Record a click on cross-sell offer
     */
    recordClick(relationshipId) {
        const rel = this.network.relationships.find(r => r.id === relationshipId);
        if (rel) {
            rel.stats.clicked++;
            this.saveNetwork();
        }
    }

    /**
     * Record a conversion
     */
    recordConversion(relationshipId, amount) {
        const rel = this.network.relationships.find(r => r.id === relationshipId);
        if (rel) {
            rel.stats.converted++;
            rel.stats.revenue += amount;

            this.network.conversions.push({
                relationshipId,
                amount,
                timestamp: new Date().toISOString()
            });

            this.saveNetwork();
        }
    }

    /**
     * Get network analytics
     */
    getAnalytics() {
        const relationships = this.network.relationships;

        const totalShown = relationships.reduce((sum, r) => sum + r.stats.shown, 0);
        const totalClicked = relationships.reduce((sum, r) => sum + r.stats.clicked, 0);
        const totalConverted = relationships.reduce((sum, r) => sum + r.stats.converted, 0);
        const totalRevenue = relationships.reduce((sum, r) => sum + r.stats.revenue, 0);

        return {
            networkSize: Object.keys(this.network.businesses).length,
            totalRelationships: relationships.length,
            activeRelationships: relationships.filter(r => r.active).length,
            metrics: {
                impressions: totalShown,
                clicks: totalClicked,
                conversions: totalConverted,
                revenue: totalRevenue,
                ctr: totalShown > 0 ? ((totalClicked / totalShown) * 100).toFixed(2) : 0,
                conversionRate: totalClicked > 0 ? ((totalConverted / totalClicked) * 100).toFixed(2) : 0,
                revenuePerConversion: totalConverted > 0 ? (totalRevenue / totalConverted).toFixed(2) : 0
            },
            topPerformers: relationships
                .filter(r => r.stats.revenue > 0)
                .sort((a, b) => b.stats.revenue - a.stats.revenue)
                .slice(0, 5)
        };
    }

    /**
     * Generate cross-sell email for customer
     */
    generateCrossSellEmail(fromBusiness, toBusiness, customerName) {
        return {
            subject: `Exclusive offer for ${fromBusiness.name} customers`,
            body: `Hi ${customerName},

As a valued ${fromBusiness.name} customer, we thought you might be interested in ${toBusiness.name}.

${toBusiness.description}

As a thank you for being part of our family, here's an exclusive 20% discount.

Use code: FAMILY20

[Check it out →]

Best,
The ${fromBusiness.name} Team`
        };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'register':
                return this.registerBusiness(task.data.business);
            case 'relationship':
                return this.createRelationship(task.data.from, task.data.to, task.data.config);
            case 'auto_detect':
                return this.autoDetectRelationships();
            case 'get_offers':
                return this.getOffers(task.data.businessId, task.data.event, task.data.customer);
            case 'click':
                return this.recordClick(task.data.relationshipId);
            case 'convert':
                return this.recordConversion(task.data.relationshipId, task.data.amount);
            case 'analytics':
                return this.getAnalytics();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default CrossSellNetwork;
