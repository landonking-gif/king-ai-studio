/**
 * Negotiator - Implements ROI Improvement #2 (Multi-Agent Negotiation Layer)
 * Uses AI agents to negotiate deals, vendor prices, and affiliate terms.
 */

export class Negotiator {
    constructor(config = {}) {
        this.db = config.db;
        this.ai = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Start a new negotiation
     */
    async startNegotiation(businessId, vendorName, item, initialTarget = {}) {
        const id = `neg-${Date.now()}`;
        const negotiation = {
            id,
            business_id: businessId,
            vendor_name: vendorName,
            item,
            status: 'initiating',
            offers: [],
            created_at: new Date().toISOString()
        };

        // Determine strategy
        const strategy = await this.developStrategy(item, initialTarget);
        negotiation.metadata = { strategy };
        negotiation.status = 'awaiting_first_offer';

        await this.save(negotiation);

        if (this.auditLogger) {
            this.auditLogger.logSystem('negotiation_started', {
                id,
                businessId,
                vendorName,
                item
            });
        }

        return negotiation;
    }

    /**
     * Develop a negotiation strategy using AI
     */
    async developStrategy(item, target) {
        const prompt = `You are a professional procurement negotiator. 
        Develop a strategy to negotiate the best possible price/terms for: ${item}
        Target Price/Terms: ${JSON.stringify(target)}
        
        Provide a JSON strategy:
        {
            "opening_offer": "Initial offer amount/terms",
            "walk_away_point": "The limit we won't cross",
            "tactics": ["List of negotiation tactics to use"],
            "leverage_points": ["Reasons why they should lower price"]
        }
        Return ONLY valid JSON.`;

        const result = await this.ai.complete(prompt, 'reasoning', { format: 'json' });
        if (result.success) {
            try { return JSON.parse(result.content); } catch (e) { return { error: 'Parse failed' }; }
        }
        return { error: result.error };
    }

    /**
     * Generate a negotiation email draft
     */
    async generateDraft(negotiationId, phase = 'opening') {
        const neg = await this.get(negotiationId);
        if (!neg) return null;

        const prompt = `Draft a professional negotiation email for the following situation:
        Vendor: ${neg.vendor_name}
        Item: ${neg.item}
        Strategy: ${JSON.stringify(neg.metadata?.strategy)}
        Phase: ${phase}
        Recent Offers: ${JSON.stringify(neg.offers)}

        Tone: Professional, firm, but partnership-oriented. 
        Return ONLY the email subject and body.`;

        const result = await this.ai.complete(prompt, 'creative');
        return result.content || 'Failed to generate draft';
    }

    /**
     * Record a new offer received from vendor
     */
    async recordOffer(negotiationId, offerData) {
        const neg = await this.get(negotiationId);
        if (!neg) return { success: false, error: 'Not found' };

        neg.offers.push({
            timestamp: new Date().toISOString(),
            ...offerData
        });

        // Use AI to analyze if we should accept or counter
        const analysis = await this.analyzeOffer(neg, offerData);
        neg.status = analysis.action === 'accept' ? 'accepted' : 'countering';

        if (analysis.action === 'accept') {
            neg.final_offer = offerData;
            neg.decided_at = new Date().toISOString();
        }

        await this.save(neg);
        return { success: true, analysis };
    }

    async analyzeOffer(neg, offer) {
        const prompt = `Analyze this negotiation offer:
        Negotiation Item: ${neg.item}
        Our Strategy: ${JSON.stringify(neg.metadata?.strategy)}
        New Offer: ${JSON.stringify(offer)}

        Should we 'accept' or 'counter'?
        Provide JSON:
        {
            "action": "accept" or "counter",
            "reasoning": "Why",
            "counter_proposal": "If countering, what is the new proposal?"
        }
        Return ONLY valid JSON.`;

        const result = await this.ai.complete(prompt, 'reasoning', { format: 'json' });
        if (result.success) {
            try { return JSON.parse(result.content); } catch (e) { return { action: 'counter', reasoning: 'Parse failed' }; }
        }
        return { action: 'counter', reasoning: 'AI failed' };
    }

    async save(neg) {
        const { id, business_id, vendor_name, item, status, offers, final_offer, created_at, updated_at, ...meta } = neg;
        await this.db.run(
            `INSERT OR REPLACE INTO negotiations (id, business_id, vendor_name, item, status, offers, final_offer, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, business_id, vendor_name, item, status, JSON.stringify(offers), JSON.stringify(final_offer), created_at, new Date().toISOString()]
        );
    }

    async get(id) {
        const row = await this.db.db.get('SELECT * FROM negotiations WHERE id = ?', [id]);
        if (row) {
            row.offers = JSON.parse(row.offers || '[]');
            row.final_offer = JSON.parse(row.final_offer || 'null');
        }
        return row;
    }
}

export default Negotiator;
