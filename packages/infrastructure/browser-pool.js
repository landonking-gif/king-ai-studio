/**
 * Browser Pool - Pre-warmed browser instances for speed
 * Maintains initialized Puppeteer pages ready for immediate use
 */

import puppeteer from 'puppeteer';

export class BrowserPool {
    constructor(config = {}) {
        this.maxSize = config.maxSize || 5;
        this.pool = [];
        this.browser = null;
    }

    async init() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.log('[BrowserPool] Browser launched');
        }
    }

    /**
     * Pre-warm pages
     */
    async warmUp() {
        await this.init();

        const needed = this.maxSize - this.pool.length;
        if (needed <= 0) return;

        console.log(`[BrowserPool] Warming up ${needed} pages...`);

        for (let i = 0; i < needed; i++) {
            const page = await this.browser.newPage();
            // Go to blank page to have it ready
            await page.goto('about:blank');
            this.pool.push({
                id: `page-${Date.now()}-${i}`,
                instance: page,
                inUse: false
            });
        }
    }

    /**
     * Get a ready page
     */
    async getPage() {
        await this.warmUp(); // Ensure pool is healthy

        const available = this.pool.find(p => !p.inUse);
        if (available) {
            available.inUse = true;
            return available;
        }

        // If none available and below max, create new (shouldn't happen with warmUp)
        if (this.pool.length < this.maxSize) {
            const page = await this.browser.newPage();
            const wrapper = {
                id: `page-${Date.now()}-extra`,
                instance: page,
                inUse: true
            };
            this.pool.push(wrapper);
            return wrapper;
        }

        throw new Error('Browser pool exhausted');
    }

    /**
     * Release a page back to pool
     */
    async releasePage(wrapper) {
        if (!wrapper) return;

        try {
            await wrapper.instance.goto('about:blank'); // Reset
            wrapper.inUse = false;
        } catch (e) {
            // If error resetting, close and remove
            try { await wrapper.instance.close(); } catch (err) { }
            this.pool = this.pool.filter(p => p.id !== wrapper.id);
        }
    }

    async shutdown() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.pool = [];
        }
    }

    async execute(task) {
        if (task.action === 'warm') return this.warmUp();
    }
}
export default BrowserPool;
