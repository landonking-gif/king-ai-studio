/**
 * A/B Tester - Tests multiple content variations and auto-selects winners
 * Enables data-driven content optimization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ABTester {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/ab-tests');
        this.ensureDataDir();
        this.loadTests();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadTests() {
        const testsFile = path.join(this.dataDir, 'tests.json');
        if (fs.existsSync(testsFile)) {
            this.tests = JSON.parse(fs.readFileSync(testsFile, 'utf-8'));
        } else {
            this.tests = {};
        }
    }

    saveTests() {
        const testsFile = path.join(this.dataDir, 'tests.json');
        fs.writeFileSync(testsFile, JSON.stringify(this.tests, null, 2));
    }

    /**
     * Create a new A/B test
     */
    createTest(config) {
        const testId = `test-${Date.now()}`;

        const test = {
            id: testId,
            name: config.name,
            type: config.type || 'content', // content, pricing, headline, cta
            businessId: config.businessId,
            variants: config.variants.map((v, i) => ({
                id: `var-${i}`,
                name: v.name || `Variant ${String.fromCharCode(65 + i)}`,
                content: v.content,
                metrics: {
                    impressions: 0,
                    clicks: 0,
                    conversions: 0,
                    revenue: 0,
                    ctr: 0,
                    conversionRate: 0
                }
            })),
            status: 'running',
            startedAt: new Date().toISOString(),
            endAt: config.duration
                ? new Date(Date.now() + config.duration).toISOString()
                : null,
            minSampleSize: config.minSampleSize || 100,
            confidenceLevel: config.confidenceLevel || 0.95,
            winner: null
        };

        this.tests[testId] = test;
        this.saveTests();

        console.log(`[ABTester] Created test: ${config.name} with ${test.variants.length} variants`);

        return test;
    }

    /**
     * Get a variant to show (simple random distribution)
     */
    getVariant(testId) {
        const test = this.tests[testId];
        if (!test || test.status !== 'running') {
            return null;
        }

        // Random selection
        const randomIndex = Math.floor(Math.random() * test.variants.length);
        const variant = test.variants[randomIndex];

        // Record impression
        variant.metrics.impressions++;
        this.saveTests();

        return {
            variantId: variant.id,
            content: variant.content,
            name: variant.name
        };
    }

    /**
     * Record an event for a variant
     */
    recordEvent(testId, variantId, eventType, value = 1) {
        const test = this.tests[testId];
        if (!test) return false;

        const variant = test.variants.find(v => v.id === variantId);
        if (!variant) return false;

        switch (eventType) {
            case 'click':
                variant.metrics.clicks += value;
                break;
            case 'conversion':
                variant.metrics.conversions += value;
                break;
            case 'revenue':
                variant.metrics.revenue += value;
                break;
            case 'impression':
                variant.metrics.impressions += value;
                break;
        }

        // Update rates
        if (variant.metrics.impressions > 0) {
            variant.metrics.ctr = (variant.metrics.clicks / variant.metrics.impressions * 100).toFixed(2);
            variant.metrics.conversionRate = (variant.metrics.conversions / variant.metrics.impressions * 100).toFixed(2);
        }

        this.saveTests();
        this.checkForWinner(testId);

        return true;
    }

    /**
     * Check if we have a statistically significant winner
     */
    checkForWinner(testId) {
        const test = this.tests[testId];
        if (!test || test.status !== 'running') return null;

        // Need minimum sample size
        const totalImpressions = test.variants.reduce((sum, v) => sum + v.metrics.impressions, 0);
        if (totalImpressions < test.minSampleSize * test.variants.length) {
            return null;
        }

        // Simple winner detection: highest conversion rate with significant difference
        const sorted = [...test.variants].sort((a, b) =>
            parseFloat(b.metrics.conversionRate) - parseFloat(a.metrics.conversionRate)
        );

        const best = sorted[0];
        const second = sorted[1];

        // If best is at least 20% better than second, declare winner
        const bestRate = parseFloat(best.metrics.conversionRate);
        const secondRate = parseFloat(second.metrics.conversionRate);

        if (bestRate > 0 && secondRate > 0) {
            const improvement = ((bestRate - secondRate) / secondRate) * 100;

            if (improvement >= 20) {
                test.winner = best.id;
                test.status = 'completed';
                test.completedAt = new Date().toISOString();
                test.winningVariant = best;
                test.improvement = improvement.toFixed(2);
                this.saveTests();

                console.log(`[ABTester] Winner found for ${test.name}: ${best.name} (+${improvement.toFixed(1)}%)`);

                return best;
            }
        }

        return null;
    }

    /**
     * Get test results
     */
    getResults(testId) {
        const test = this.tests[testId];
        if (!test) return null;

        const results = {
            ...test,
            totalImpressions: test.variants.reduce((sum, v) => sum + v.metrics.impressions, 0),
            totalConversions: test.variants.reduce((sum, v) => sum + v.metrics.conversions, 0),
            totalRevenue: test.variants.reduce((sum, v) => sum + v.metrics.revenue, 0),
            ranking: [...test.variants].sort((a, b) =>
                parseFloat(b.metrics.conversionRate) - parseFloat(a.metrics.conversionRate)
            )
        };

        return results;
    }

    /**
     * End a test early
     */
    endTest(testId) {
        const test = this.tests[testId];
        if (!test) return null;

        // Force winner selection
        const sorted = [...test.variants].sort((a, b) =>
            parseFloat(b.metrics.conversionRate) - parseFloat(a.metrics.conversionRate)
        );

        test.winner = sorted[0].id;
        test.status = 'completed';
        test.completedAt = new Date().toISOString();
        test.winningVariant = sorted[0];
        test.endedEarly = true;

        this.saveTests();

        return test;
    }

    /**
     * Get running tests
     */
    getRunningTests() {
        return Object.values(this.tests).filter(t => t.status === 'running');
    }

    /**
     * Get completed tests
     */
    getCompletedTests() {
        return Object.values(this.tests).filter(t => t.status === 'completed');
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'create':
                return this.createTest(task.data);
            case 'get_variant':
                return this.getVariant(task.data.testId);
            case 'record':
                return this.recordEvent(task.data.testId, task.data.variantId, task.data.eventType, task.data.value);
            case 'results':
                return this.getResults(task.data.testId);
            case 'end':
                return this.endTest(task.data.testId);
            case 'running':
                return this.getRunningTests();
            case 'completed':
                return this.getCompletedTests();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ABTester;
