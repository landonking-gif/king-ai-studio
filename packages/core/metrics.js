/**
 * Metrics Module - Prometheus monitoring for King AI Studio
 * Tracks CPU, memory, API usage, and business metrics
 */

import { register, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';

export class Metrics {
    constructor() {
        // Enable default metrics (CPU, memory, etc.)
        collectDefaultMetrics();

        // Custom metrics
        this.businessCount = new Gauge({
            name: 'king_business_total',
            help: 'Total number of businesses'
        });

        this.taskCount = new Counter({
            name: 'king_tasks_total',
            help: 'Total tasks processed',
            labelNames: ['status']
        });

        this.apiRequests = new Counter({
            name: 'king_api_requests_total',
            help: 'Total API requests',
            labelNames: ['provider', 'model']
        });

        this.responseTime = new Histogram({
            name: 'king_response_time_seconds',
            help: 'Response time in seconds',
            labelNames: ['provider', 'model'],
            buckets: [0.1, 0.5, 1, 2, 5, 10]
        });

        this.memoryUsage = new Gauge({
            name: 'king_memory_usage_bytes',
            help: 'Memory usage in bytes'
        });

        this.cpuUsage = new Gauge({
            name: 'king_cpu_usage_percent',
            help: 'CPU usage percentage'
        });
    }

    /**
     * Update business count
     */
    setBusinessCount(count) {
        this.businessCount.set(count);
    }

    /**
     * Increment task count
     */
    incrementTaskCount(status) {
        this.taskCount.inc({ status });
    }

    /**
     * Increment API request count
     */
    incrementApiRequest(provider, model) {
        this.apiRequests.inc({ provider, model });
    }

    /**
     * Record response time
     */
    recordResponseTime(provider, model, duration) {
        this.responseTime.observe({ provider, model }, duration / 1000);
    }

    /**
     * Update memory usage
     */
    setMemoryUsage(bytes) {
        this.memoryUsage.set(bytes);
    }

    /**
     * Update CPU usage
     */
    setCpuUsage(percent) {
        this.cpuUsage.set(percent);
    }

    /**
     * Get metrics for Prometheus
     */
    async getMetrics() {
        return register.metrics();
    }

    /**
     * Get registry
     */
    getRegistry() {
        return register;
    }
}

export default Metrics;