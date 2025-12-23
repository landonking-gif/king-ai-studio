/**
 * Content Queue - Pre-generates content for faster posting
 * Maintains a buffer of ready-to-post content per platform
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ContentQueue {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/content-queue');
        this.ensureDataDir();

        this.modelRouter = config.modelRouter || new ModelRouter();

        // Queue configuration
        this.config = {
            minQueueSize: config.minQueueSize || 10,
            maxQueueSize: config.maxQueueSize || 50,
            platforms: config.platforms || ['twitter', 'linkedin', 'instagram', 'facebook']
        };

        this.loadQueues();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadQueues() {
        this.queues = {};

        for (const platform of this.config.platforms) {
            const queueFile = path.join(this.dataDir, `${platform}-queue.json`);
            if (fs.existsSync(queueFile)) {
                this.queues[platform] = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
            } else {
                this.queues[platform] = [];
            }
        }
    }

    saveQueue(platform) {
        const queueFile = path.join(this.dataDir, `${platform}-queue.json`);
        fs.writeFileSync(queueFile, JSON.stringify(this.queues[platform], null, 2));
    }

    /**
     * Add content to queue
     */
    add(platform, content) {
        if (!this.queues[platform]) {
            this.queues[platform] = [];
        }

        const item = {
            id: `content-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            content,
            platform,
            createdAt: new Date().toISOString(),
            status: 'queued'
        };

        this.queues[platform].push(item);
        this.saveQueue(platform);

        return item;
    }

    /**
     * Get next content from queue (FIFO)
     */
    getNext(platform) {
        const queue = this.queues[platform];
        if (!queue || queue.length === 0) return null;

        const item = queue.shift();
        item.status = 'claimed';
        item.claimedAt = new Date().toISOString();

        this.saveQueue(platform);

        return item;
    }

    /**
     * Return content to queue (if post failed)
     */
    returnToQueue(platform, item) {
        item.status = 'queued';
        item.returnedAt = new Date().toISOString();

        this.queues[platform].unshift(item);
        this.saveQueue(platform);
    }

    /**
     * Generate content for a platform
     */
    async generateContent(platform, businessContext, count = 5) {
        const prompts = {
            twitter: `Generate ${count} engaging tweets for a business. Each tweet should be under 280 characters, include relevant hashtags, and be designed to drive engagement.

Business: ${businessContext}

Return as JSON array: [{"text": "tweet text", "hashtags": ["tag1", "tag2"]}]`,

            linkedin: `Generate ${count} professional LinkedIn posts for a business. Each post should be thought-provoking, include a call to action, and be professional in tone.

Business: ${businessContext}

Return as JSON array: [{"text": "post text", "cta": "call to action"}]`,

            instagram: `Generate ${count} Instagram captions for a business. Each caption should be engaging, include emojis, relevant hashtags, and have a strong hook.

Business: ${businessContext}

Return as JSON array: [{"caption": "caption text", "hashtags": ["tag1", "tag2"]}]`,

            facebook: `Generate ${count} Facebook posts for a business. Each post should be conversational yet professional, designed to drive comments and shares.

Business: ${businessContext}

Return as JSON array: [{"text": "post text", "cta": "call to action"}]`
        };

        const prompt = prompts[platform] || prompts.twitter;

        try {
            const result = await this.modelRouter.complete(prompt, 'creative');

            if (result.success && result.content) {
                // Try to parse JSON
                const contentMatch = result.content.match(/\[[\s\S]*\]/);
                if (contentMatch) {
                    const contents = JSON.parse(contentMatch[0]);

                    // Add to queue
                    const added = [];
                    for (const content of contents) {
                        const item = this.add(platform, content);
                        added.push(item);
                    }

                    console.log(`[ContentQueue] Generated ${added.length} items for ${platform}`);
                    return { success: true, items: added };
                }
            }

            return { success: false, error: 'Failed to parse generated content' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Refill queues that are below minimum
     */
    async refillQueues(businessContext) {
        const results = {};

        for (const platform of this.config.platforms) {
            const currentSize = this.queues[platform]?.length || 0;

            if (currentSize < this.config.minQueueSize) {
                const needed = this.config.minQueueSize - currentSize;
                console.log(`[ContentQueue] ${platform} queue low (${currentSize}), generating ${needed} more`);

                results[platform] = await this.generateContent(platform, businessContext, needed);
            } else {
                results[platform] = { success: true, message: `Queue sufficient (${currentSize})` };
            }
        }

        return results;
    }

    /**
     * Get queue status
     */
    getStatus() {
        const status = {};

        for (const platform of this.config.platforms) {
            const queue = this.queues[platform] || [];
            status[platform] = {
                size: queue.length,
                isLow: queue.length < this.config.minQueueSize,
                oldest: queue.length > 0 ? queue[0].createdAt : null,
                newest: queue.length > 0 ? queue[queue.length - 1].createdAt : null
            };
        }

        return status;
    }

    /**
     * Clear old content from queues
     */
    clearOld(maxAgeDays = 7) {
        const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        let cleared = 0;

        for (const platform of this.config.platforms) {
            const before = this.queues[platform].length;
            this.queues[platform] = this.queues[platform].filter(item =>
                new Date(item.createdAt) > cutoff
            );
            cleared += before - this.queues[platform].length;
            this.saveQueue(platform);
        }

        return { cleared };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'add':
                return this.add(task.data.platform, task.data.content);
            case 'get_next':
                return this.getNext(task.data.platform);
            case 'return':
                return this.returnToQueue(task.data.platform, task.data.item);
            case 'generate':
                return this.generateContent(task.data.platform, task.data.context, task.data.count);
            case 'refill':
                return this.refillQueues(task.data.context);
            case 'status':
                return this.getStatus();
            case 'clear_old':
                return this.clearOld(task.data.maxAgeDays);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ContentQueue;
