/**
 * Auto Testimonial - Automated review collection and management
 * Requests reviews, analyzes sentiment, and displays social proof
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutoTestimonial {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/testimonials');
        this.ensureDataDir();
        this.modelRouter = config.modelRouter || new ModelRouter();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Request a testimonial from a customer
     */
    async requestTestimonial(business, customer) {
        const prompt = `Write a polite, personalized email asking ${customer.name} for a review of ${business.name}.
Service provided: ${customer.service}
Tone: Professional gratitude.
Include a direct link: https://${business.name.toLowerCase()}.com/review

Keep it under 100 words.`;

        const email = await this.modelRouter.complete(prompt, 'creative');

        // Simulating email send
        console.log(`[Testimonial] Sending request to ${customer.email}`);

        return {
            sent: true,
            emailContent: email.content,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Process and analyze a new review
     */
    async processReview(businessId, review) {
        // Sentiment analysis
        const prompt = `Analyze the sentiment of this review: "${review.text}"
Return JSON: {"score": 1-10, "sentiment": "positive/neutral/negative", "keywords": [], "highlightable_quote": ""}`;

        const analysis = await this.modelRouter.complete(prompt, 'fast');
        let data = {};
        try {
            const jsonMatch = analysis.content.match(/\{[\s\S]*\}/);
            data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (e) { }

        const processed = {
            id: `rev-${Date.now()}`,
            businessId,
            customer: review.customer,
            text: review.text,
            rating: review.rating,
            analysis: data,
            display: data.score >= 8, // Auto-approve high scores
            createdAt: new Date().toISOString()
        };

        const file = path.join(this.dataDir, `${businessId}-reviews.jsonl`);
        fs.appendFileSync(file, JSON.stringify(processed) + '\n');

        return processed;
    }

    /**
     * Get Best Testimonials for Display
     */
    getBest(businessId, count = 3) {
        const file = path.join(this.dataDir, `${businessId}-reviews.jsonl`);
        if (!fs.existsSync(file)) return [];

        const reviews = fs.readFileSync(file, 'utf-8')
            .split('\n')
            .filter(l => l)
            .map(JSON.parse);

        return reviews
            .filter(r => r.display)
            .sort((a, b) => (b.analysis.score || 0) - (a.analysis.score || 0))
            .slice(0, count);
    }

    async execute(task) {
        switch (task.action) {
            case 'request': return this.requestTestimonial(task.data.business, task.data.customer);
            case 'process': return this.processReview(task.data.businessId, task.data.review);
            case 'get_best': return this.getBest(task.data.businessId, task.data.count);
        }
    }
}
export default AutoTestimonial;
