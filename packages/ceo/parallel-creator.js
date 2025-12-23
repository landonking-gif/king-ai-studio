/**
 * Parallel Creator - Spins up multiple businesses simultaneously
 * Orchestrates parallel business creation for maximum throughput
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ParallelCreator extends EventEmitter {
    constructor(config = {}) {
        super();
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/parallel');
        this.ensureDataDir();

        this.maxConcurrent = config.maxConcurrent || 5;
        this.activeJobs = new Map();
        this.queue = [];
        this.completed = [];
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Add multiple businesses to creation queue
     */
    queueBusinesses(businesses) {
        for (const business of businesses) {
            const job = {
                id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                business,
                status: 'queued',
                createdAt: new Date().toISOString(),
                startedAt: null,
                completedAt: null,
                result: null,
                error: null
            };
            this.queue.push(job);
        }

        console.log(`[ParallelCreator] Queued ${businesses.length} businesses. Total queue: ${this.queue.length}`);

        // Start processing
        this.processQueue();

        return {
            total: businesses.length,
            queueSize: this.queue.length,
            activeJobs: this.activeJobs.size
        };
    }

    /**
     * Process the queue with parallel execution
     */
    async processQueue() {
        while (this.queue.length > 0 || this.activeJobs.size > 0) {
            // Start new jobs up to max concurrent
            while (this.queue.length > 0 && this.activeJobs.size < this.maxConcurrent) {
                const job = this.queue.shift();
                this.startJob(job);
            }

            // Wait a bit before checking again
            await this.sleep(1000);
        }

        this.emit('all_complete', {
            total: this.completed.length,
            successful: this.completed.filter(j => j.status === 'completed').length,
            failed: this.completed.filter(j => j.status === 'failed').length
        });
    }

    /**
     * Start a single job
     */
    async startJob(job) {
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        this.activeJobs.set(job.id, job);

        this.emit('job_start', job);
        console.log(`[ParallelCreator] Starting: ${job.business.name} (${this.activeJobs.size}/${this.maxConcurrent} active)`);

        try {
            // Execute business creation
            const result = await this.createBusiness(job.business);

            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.result = result;

            this.emit('job_complete', job);
            console.log(`[ParallelCreator] Completed: ${job.business.name}`);

        } catch (error) {
            job.status = 'failed';
            job.completedAt = new Date().toISOString();
            job.error = error.message;

            this.emit('job_error', job);
            console.log(`[ParallelCreator] Failed: ${job.business.name} - ${error.message}`);
        }

        // Move to completed
        this.activeJobs.delete(job.id);
        this.completed.push(job);

        // Save progress
        this.saveProgress();
    }

    /**
     * Create a business (to be overridden or connected to real system)
     */
    async createBusiness(business) {
        // This would connect to the actual business creation flow
        // For now, returns simulation

        const steps = business.tasks || [];
        const results = [];

        for (const step of steps) {
            // Simulate step execution
            await this.sleep(500);
            results.push({
                step: step.title,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

            this.emit('step_complete', { business: business.name, step: step.title });
        }

        return {
            businessId: `biz-${Date.now()}`,
            name: business.name,
            stepsCompleted: results.length,
            status: 'launched'
        };
    }

    /**
     * Save progress to disk
     */
    saveProgress() {
        const progressFile = path.join(this.dataDir, 'progress.json');
        fs.writeFileSync(progressFile, JSON.stringify({
            active: Array.from(this.activeJobs.values()),
            queued: this.queue,
            completed: this.completed.slice(-50), // Keep last 50
            timestamp: new Date().toISOString()
        }, null, 2));
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            queued: this.queue.length,
            active: this.activeJobs.size,
            completed: this.completed.length,
            successful: this.completed.filter(j => j.status === 'completed').length,
            failed: this.completed.filter(j => j.status === 'failed').length,
            maxConcurrent: this.maxConcurrent,
            activeJobs: Array.from(this.activeJobs.values()).map(j => ({
                id: j.id,
                name: j.business.name,
                startedAt: j.startedAt
            }))
        };
    }

    /**
     * Pause processing
     */
    pause() {
        this.paused = true;
        console.log('[ParallelCreator] Paused');
    }

    /**
     * Resume processing
     */
    resume() {
        this.paused = false;
        this.processQueue();
        console.log('[ParallelCreator] Resumed');
    }

    /**
     * Cancel a specific job
     */
    cancelJob(jobId) {
        const queueIndex = this.queue.findIndex(j => j.id === jobId);
        if (queueIndex !== -1) {
            const job = this.queue.splice(queueIndex, 1)[0];
            job.status = 'cancelled';
            this.completed.push(job);
            return { success: true, status: 'cancelled' };
        }

        if (this.activeJobs.has(jobId)) {
            return { success: false, error: 'Job is already running' };
        }

        return { success: false, error: 'Job not found' };
    }

    /**
     * Scale concurrency
     */
    scale(newMax) {
        this.maxConcurrent = Math.max(1, Math.min(20, newMax));
        console.log(`[ParallelCreator] Scaled to ${this.maxConcurrent} concurrent`);
        return { maxConcurrent: this.maxConcurrent };
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'queue':
                return this.queueBusinesses(task.data.businesses);
            case 'status':
                return this.getStatus();
            case 'pause':
                return this.pause();
            case 'resume':
                return this.resume();
            case 'cancel':
                return this.cancelJob(task.data.jobId);
            case 'scale':
                return this.scale(task.data.maxConcurrent);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ParallelCreator;
