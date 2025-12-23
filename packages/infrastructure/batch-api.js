/**
 * Batch API - Optimizes external API calls
 * Groups multiple small requests into single batch calls where supported
 */

export class BatchAPI {
    constructor(config = {}) {
        this.queue = [];
        this.batchSize = config.batchSize || 20;
        this.flushInterval = config.flushInterval || 1000; // 1 second

        // Auto-flush
        setInterval(() => this.flush(), this.flushInterval);
    }

    /**
     * Add request to batch
     */
    add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                request,
                resolve,
                reject,
                timestamp: Date.now()
            });

            if (this.queue.length >= this.batchSize) {
                this.flush();
            }
        });
    }

    /**
     * Process batch
     */
    async flush() {
        if (this.queue.length === 0) return;

        const batch = this.queue.splice(0, this.batchSize);
        console.log(`[BatchAPI] Flushing ${batch.length} requests`);

        // Group by endpoint/type if needed
        // For simulation, we'll process simply

        // In real scenario: Send 1 HTTP request with array of items

        // Simulate processing
        for (const item of batch) {
            try {
                // Determine handler based on request type
                const result = { success: true, processed: true, data: item.request.data };
                item.resolve(result);
            } catch (e) {
                item.reject(e);
            }
        }
    }

    async execute(task) {
        if (task.action === 'add') return this.add(task.data.request);
    }
}
export default BatchAPI;
