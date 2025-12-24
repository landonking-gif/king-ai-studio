/**
 * Model Router - Intelligent AI model selection with rate limit handling
 * Routes requests to optimal model, handles fallbacks, tracks usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ModelRouter {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/models');
        this.ensureDataDir();

        // In-memory cache for prompts
        this.cache = new Map();

        // Circuit breaker for API providers
        this.circuitBreakers = {
            openai: { failures: 0, lastFail: 0, state: 'closed' },
            anthropic: { failures: 0, lastFail: 0, state: 'closed' },
            gemini: { failures: 0, lastFail: 0, state: 'closed' },
            deepseek: { failures: 0, lastFail: 0, state: 'closed' },
            ollama: { failures: 0, lastFail: 0, state: 'closed' }
        };
        this.circuitThreshold = 5; // Failures before opening
        this.circuitTimeout = 60000; // 1 minute timeout

        // API Keys from environment
        const getKeys = (list, single) => {
            const parsedList = this.parseKeys(list);
            if (parsedList.length > 0) return parsedList;
            return this.parseKeys(single);
        };

        this.apiKeys = {
            openai: getKeys(process.env.OPENAI_API_KEYS, process.env.OPENAI_API_KEY),
            anthropic: getKeys(process.env.ANTHROPIC_API_KEYS, process.env.ANTHROPIC_API_KEY),
            gemini: getKeys(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY),
            deepseek: getKeys(process.env.DEEPSEEK_API_KEYS, process.env.DEEPSEEK_API_KEY)
        };
        console.log('[ModelRouter] API Keys Status:', {
            openai: this.apiKeys.openai.length > 0,
            anthropic: this.apiKeys.anthropic.length > 0,
            gemini: this.apiKeys.gemini.length > 0,
            deepseek: this.apiKeys.deepseek.length > 0
        });

        // Model configurations
        this.models = {
            // Local (Ollama) - No rate limits
            'ollama:llama3.1:8b': {
                provider: 'ollama',
                model: 'llama3.1:8b',
                type: 'reasoning',
                rateLimit: Infinity,
                cost: 0,
                priority: 1
            },
            'ollama:fast': {
                provider: 'ollama',
                model: 'llama3.2:1b',
                type: 'fast',
                rateLimit: Infinity,
                cost: 0,
                priority: 1
            },
            'ollama:llama3.2:1b': {
                provider: 'ollama',
                model: 'llama3.2:1b',
                type: 'rapid',
                rateLimit: Infinity,
                cost: 0,
                priority: 1
            },

            // OpenAI
            'openai:gpt-4o': {
                provider: 'openai',
                model: 'gpt-4o',
                type: 'reasoning',
                rateLimit: 500, // requests per minute
                cost: 0.005,
                priority: 2
            },
            'openai:gpt-4o-mini': {
                provider: 'openai',
                model: 'gpt-4o-mini',
                type: 'fast',
                rateLimit: 1000,
                cost: 0.00015,
                priority: 2
            },

            // Anthropic
            'anthropic:claude-3-5-sonnet': {
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20241022',
                type: 'reasoning',
                rateLimit: 50,
                cost: 0.003,
                priority: 3
            },
            'anthropic:claude-3-haiku': {
                provider: 'anthropic',
                model: 'claude-3-haiku-20240307',
                type: 'fast',
                rateLimit: 100,
                cost: 0.00025,
                priority: 2
            },

            // Gemini
            'gemini:gemini-1.5-flash': {
                provider: 'gemini',
                model: 'gemini-1.5-flash',
                type: 'fast',
                rateLimit: 60,
                cost: 0,
                priority: 1
            },
            'gemini:gemini-1.5-flash-latest': {
                provider: 'gemini',
                model: 'gemini-1.5-flash-latest',
                type: 'fast',
                rateLimit: 60,
                cost: 0,
                priority: 1
            },
            'gemini:gemini-1.5-pro': {
                provider: 'gemini',
                model: 'gemini-1.5-pro',
                type: 'reasoning',
                rateLimit: 30,
                cost: 0,
                priority: 2
            },
            'gemini:gemini-1.5-pro-latest': {
                provider: 'gemini',
                model: 'gemini-1.5-pro-latest',
                type: 'reasoning',
                rateLimit: 30,
                cost: 0,
                priority: 2
            },

            // DeepSeek API
            'deepseek:deepseek-chat': {
                provider: 'deepseek',
                model: 'deepseek-chat',
                type: 'reasoning',
                rateLimit: 60,
                cost: 0.0002,
                priority: 1
            },

            // Dark-Pool / Private Models (ROI #20)
            'private:llama-3-70b-stealth': {
                provider: 'private',
                model: 'llama3.1:8b',
                type: 'reasoning',
                rateLimit: 5000,
                cost: 0,
                priority: 0 // Ultimate Priority
            },
            'private:mistral-large-secure': {
                provider: 'private',
                model: 'llama3.1:8b',
                type: 'fast',
                rateLimit: 5000,
                cost: 0,
                priority: 0
            }
        };

        // Task type to model preference
        this.taskPreferences = {
            reasoning: ['gemini:gemini-1.5-pro', 'gemini:gemini-1.5-pro-latest', 'openai:gpt-4o', 'anthropic:claude-3-5-sonnet', 'ollama:llama3.1:8b'],
            coding: ['anthropic:claude-3-5-sonnet', 'openai:gpt-4o', 'gemini:gemini-1.5-flash', 'gemini:gemini-1.5-flash-latest', 'ollama:llama3.1:8b'],
            fast: ['gemini:gemini-1.5-flash', 'gemini:gemini-1.5-flash-latest', 'openai:gpt-4o-mini', 'anthropic:claude-3-haiku', 'ollama:fast'],
            creative: ['gemini:gemini-1.5-pro', 'gemini:gemini-1.5-pro-latest', 'anthropic:claude-3-5-sonnet', 'openai:gpt-4o'],
            bulk: ['gemini:gemini-1.5-flash', 'gemini:gemini-1.5-flash-latest', 'openai:gpt-4o-mini', 'ollama:fast']
        };

        // Rate limit tracking
        this.usageTracker = this.loadUsageTracker();

        // API key rotation indices
        this.keyIndices = {
            openai: 0,
            anthropic: 0,
            gemini: 0,
            deepseek: 0
        };

        // System Prompt (Dynamic)
        this.systemPrompt = null;
    }

    /**
     * Set the global system prompt for all requests
     */
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
        console.log(`[ModelRouter] 🧠 System Prompt updated (Length: ${prompt.length} chars)`);
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Check if Ollama is available
     */
    async checkOllama() {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            if (!response.ok) return { available: false };
            const data = await response.json();
            return {
                available: true,
                models: data.models?.map(m => m.name) || []
            };
        } catch (e) {
            return { available: false, error: e.message };
        }
    }

    /**
     * Parse comma-separated API keys, ignoring obvious placeholders
     */
    parseKeys(keyString) {
        if (!keyString) return [];
        const placeholders = ['key1', 'key2', 'key3', 'your-api-key', 'your-key-here', 'sk-key1', 'sk-key2', 'sk-key3'];
        return keyString.split(',')
            .map(k => k.trim())
            .filter(k => k && !placeholders.includes(k.toLowerCase()));
    }

    /**
     * Get next API key with rotation
     */
    getApiKey(provider) {
        const keys = this.apiKeys[provider];
        if (!keys || keys.length === 0) return null;

        const index = this.keyIndices[provider];
        const key = keys[index];

        // Rotate to next key
        this.keyIndices[provider] = (index + 1) % keys.length;

        return key;
    }

    /**
     * Load usage tracker from disk
     */
    loadUsageTracker() {
        const trackerFile = path.join(this.dataDir, 'usage-tracker.json');
        if (fs.existsSync(trackerFile)) {
            return JSON.parse(fs.readFileSync(trackerFile, 'utf-8'));
        }
        return {};
    }

    /**
     * Save usage tracker to disk
     */
    saveUsageTracker() {
        const trackerFile = path.join(this.dataDir, 'usage-tracker.json');
        fs.writeFileSync(trackerFile, JSON.stringify(this.usageTracker, null, 2));
    }

    /**
     * Check if model is rate limited
     */
    isRateLimited(modelId) {
        const usage = this.usageTracker[modelId];
        if (!usage) return false;

        const model = this.models[modelId];
        if (!model) return false;

        // Check if within the rate limit window (1 minute)
        const now = Date.now();
        const windowStart = now - 60000;

        // Filter requests within window
        const recentRequests = (usage.requests || []).filter(t => t > windowStart);

        return recentRequests.length >= model.rateLimit;
    }

    /**
     * Record a request for rate limiting
     */
    recordRequest(modelId) {
        if (!this.usageTracker[modelId]) {
            this.usageTracker[modelId] = { requests: [], totalCost: 0 };
        }

        this.usageTracker[modelId].requests.push(Date.now());

        // Clean old requests (older than 5 minutes)
        const cutoff = Date.now() - 300000;
        this.usageTracker[modelId].requests =
            this.usageTracker[modelId].requests.filter(t => t > cutoff);

        this.saveUsageTracker();
    }

    /**
     * Select the best model for a task type
     */
    selectModel(taskType = 'fast', options = {}) {
        const preferences = this.taskPreferences[taskType] || this.taskPreferences.fast;
        const forceLocal = options.forceLocal;
        const forcePrivate = options.forcePrivate;
        const maxCost = options.maxCost;

        // If forcePrivate, only look at private models
        if (forcePrivate) {
            const privateId = Object.keys(this.models).find(id => id.startsWith('private:') && this.models[id].type === taskType);
            return privateId || Object.keys(this.models).find(id => id.startsWith('private:'));
        }

        for (const modelId of preferences) {
            const model = this.models[modelId];

            // Skip if no model config
            if (!model) continue;

            // Skip cloud if forcing local
            if (forceLocal && model.provider !== 'ollama') continue;

            // Skip if exceeds cost limit
            if (maxCost !== undefined && model.cost > maxCost) continue;

            // Skip if rate limited
            if (this.isRateLimited(modelId)) {
                console.log(`[ModelRouter] ${modelId} is rate limited, trying next...`);
                continue;
            }

            // Skip if no API key for cloud provider
            const apiKey = model.provider !== 'ollama' ? this.getApiKey(model.provider) : 'local';
            if (model.provider !== 'ollama' && !apiKey) {
                console.log(`[ModelRouter] Skipping ${modelId} - No API Key`);
                continue;
            }

            console.log(`[ModelRouter] Selected: ${modelId} for ${taskType} (Key available: ${!!apiKey})`);
            return modelId;
        }

        // Fallback to first available Ollama model
        console.log('[ModelRouter] All cloud models unavailable, falling back to Ollama');
        return 'ollama:llama3.1:8b';
    }

    /**
     * Complete a prompt using the best available model, with automatic fallback
     */
    async complete(prompt, taskType = 'fast', options = {}) {
        // If specific model requested, only use that
        if (options.model) {
            return this.executeModelRequest(options.model, prompt, options);
        }

        const preferences = this.taskPreferences[taskType] || this.taskPreferences.fast;
        const promises = [];

        for (const modelId of preferences) {
            const model = this.models[modelId];
            if (!model) continue;

            // Check if model is rate limited
            if (this.isRateLimited(modelId)) continue;

            // Skip if no API key
            if (model.provider !== 'ollama' && !this.getApiKey(model.provider)) {
                continue;
            }

            promises.push(this.executeModelRequest(modelId, prompt, options));
        }

        if (promises.length === 0) {
            return { success: false, error: 'No models available', taskType };
        }

        const results = await Promise.allSettled(promises);
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                return result.value;
            }
        }

        // If all failed, collect errors
        const errors = results.map(r => r.status === 'rejected' ? r.reason.message : r.value.error).filter(e => e);
        const lastError = errors[errors.length - 1];

        // ROI #20: If all public models fail, try Dark-Pool
        if (!options.noFallback) {
            console.log('[ModelRouter] Public models failed/unavailable, entering Dark-Pool...');
            const darkModel = this.selectModel(taskType, { ...options, forcePrivate: true });
            if (darkModel) {
                return this.executeModelRequest(darkModel, prompt, { ...options, noFallback: true });
            }
        }

        return { success: false, error: lastError || 'All models failed', taskType };
    }

    /**
     * Internal helper to execute a request for a specific model
     */
    async executeModelRequest(modelId, prompt, options = {}) {
        if (process.env.MOCK_AI === 'true') {
            let content = "Mocked AI Response";
            if (prompt.includes('Return ONLY valid JSON')) {
                // Return a structure that satisfies both BusinessAnalyzer and others
                content = JSON.stringify({
                    viability: { score: 9, reasoning: "Mocked success" },
                    marketAnalysis: { targetAudience: "Global", marketSize: "Scaling", competition: "Low", differentiator: "AI Automation" },
                    revenueModel: { primary: "SaaS", secondary: [], pricingStrategy: "Subscription" },
                    requiredSystems: [], estimatedCosts: { startup: "$100", monthly: "$10" },
                    risks: [], timeline: { mvp: "2 weeks", profitable: "2 months" },
                    immediateNextSteps: ["Initialize project"],
                    executiveSummary: "Mocked summary", mission: "Automate everything", vision: "Infinite scaling",
                    phases: [
                        {
                            name: "Launch", duration: "1 month", objectives: ["Reach users"], tasks: [
                                { name: "Setup server", description: "Deploy code", automated: true, requiresApproval: false }
                            ], milestones: ["Release"], budget: "$100"
                        }
                    ],
                    automationOpportunities: [], legalRequirements: [], financialProjections: {}, kpis: [], successCriteria: "Growth"
                });
            }
            return { success: true, content, modelId, provider: 'mock' };
        }
        const model = this.models[modelId];
        if (!model) return { success: false, error: `Unknown model: ${modelId}` };

        // Check circuit breaker
        if (!this.checkCircuit(model.provider)) {
            return { success: false, error: `Circuit breaker open for ${model.provider}` };
        }

        // Check cache
        const cacheKey = this.hashPrompt(prompt);
        const cached = this.cache.get(`${modelId}:${cacheKey}`);
        if (cached) {
            return { ...cached, cached: true };
        }

        this.recordRequest(modelId);
        console.log(`[ModelRouter] Executing: ${modelId}`);

        try {
            let result;
            switch (model.provider) {
                case 'ollama':
                    result = await this.completeOllama(model.model, prompt);
                    break;
                case 'openai':
                    result = await this.completeOpenAI(model.model, prompt);
                    break;
                case 'anthropic':
                    result = await this.completeAnthropic(model.model, prompt);
                    break;
                case 'gemini':
                    result = await this.completeGemini(model.model, prompt);
                    break;
                case 'deepseek':
                    result = await this.completeDeepSeek(model.model, prompt);
                    break;
                case 'private':
                    result = await this.completePrivate(model.model, prompt);
                    break;
                default:
                    return { success: false, error: `Unknown provider: ${model.provider}` };
            }

            if (result.success && model.cost > 0) {
                this.usageTracker[modelId].totalCost += model.cost;
                this.saveUsageTracker();
            }

            // Cache successful results
            if (result.success) {
                this.cache.set(`${modelId}:${cacheKey}`, result);
                this.recordCircuitSuccess(model.provider);
            }

            return { ...result, modelId, provider: model.provider };
        } catch (error) {
            console.warn(`[ModelRouter] ${modelId} execution error: ${error.message}`);
            this.recordCircuitFailure(model.provider);
            return { success: false, error: error.message, modelId };
        }
    }

    /**
     * Complete with Private/Dark-Pool (simulated)
     */
    async completePrivate(model, prompt) {
        // In reality, this might be a local GPU server or a secure VPC endpoint
        console.log(`[ModelRouter] Routing to Dark-Pool Node [${model}]`);
        return this.completeOllama(model, prompt); // For now, use Ollama as the "Private" engine
    }

    /**
     * Complete with Ollama (local)
     */
    async completeOllama(model, prompt) {
        let fullPrompt = prompt;
        if (this.systemPrompt) {
            fullPrompt = `System: ${this.systemPrompt}\n\nUser: ${prompt}`;
        }

        console.log(`[ModelRouter] Calling Ollama: ${model}...`);
        const startTime = Date.now();
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt: fullPrompt, stream: false }),
            signal: AbortSignal.timeout(60000) // 60s timeout
        });
        console.log(`[ModelRouter] Ollama response: ${response.status} (${Date.now() - startTime}ms)`);

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();

        // Extract reasoning from <think> tags
        const thinkMatch = data.response?.match(/<think>([\s\S]*?)<\/think>/);
        const content = thinkMatch
            ? data.response.replace(/<think>[\s\S]*?<\/think>/, '').trim()
            : data.response;

        return {
            success: true,
            content,
            reasoning: thinkMatch ? thinkMatch[1].trim() : null,
            rawContent: data.response
        };
    }

    /**
     * Complete with OpenAI
     */
    async completeOpenAI(model, prompt) {
        const apiKey = this.getApiKey('openai');
        if (!apiKey) throw new Error('No OpenAI API key');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    ...(this.systemPrompt ? [{ role: 'system', content: this.systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ],
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `OpenAI error: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            content: data.choices[0]?.message?.content || ''
        };
    }

    /**
     * Complete with Anthropic
     */
    async completeAnthropic(model, prompt) {
        const apiKey = this.getApiKey('anthropic');
        if (!apiKey) throw new Error('No Anthropic API key');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                system: this.systemPrompt || undefined,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `Anthropic error: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            content: data.content[0]?.text || ''
        };
    }

    /**
     * Complete with Gemini
     */
    async completeGemini(model, prompt) {
        const apiKey = this.getApiKey('gemini');
        if (!apiKey) throw new Error('No Gemini API key');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error(`[ModelRouter] Gemini Error (${response.status}):`, JSON.stringify(error, null, 2));
            throw new Error(error.error?.message || `Gemini error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            console.warn(`[ModelRouter] Gemini returned empty response:`, JSON.stringify(data, null, 2));
            return { success: false, error: 'Empty response from Gemini' };
        }

        return {
            success: true,
            content
        };
    }

    /**
     * Complete with DeepSeek API
     */
    async completeDeepSeek(model, prompt) {
        const apiKey = this.getApiKey('deepseek');
        if (!apiKey) throw new Error('No DeepSeek API key');

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    ...(this.systemPrompt ? [{ role: 'system', content: this.systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `DeepSeek error: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            content: data.choices[0]?.message?.content || ''
        };
    }

    /**
     * Get usage statistics
     */
    getUsageStats() {
        const stats = {};
        for (const [modelId, usage] of Object.entries(this.usageTracker)) {
            stats[modelId] = {
                requestsLast5Min: usage.requests?.length || 0,
                totalCost: usage.totalCost || 0,
                isRateLimited: this.isRateLimited(modelId)
            };
        }
        return stats;
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'complete':
                return this.complete(task.data.prompt, task.data.taskType, task.data.options);
            case 'select':
                return { model: this.selectModel(task.data.taskType, task.data.options) };
            case 'stats':
                return this.getUsageStats();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }

    /**
     * Check circuit breaker for provider
     */
    checkCircuit(provider) {
        const cb = this.circuitBreakers[provider];
        if (!cb) return true; // Allow if no breaker

        if (cb.state === 'open') {
            if (Date.now() - cb.lastFail > this.circuitTimeout) {
                cb.state = 'half-open';
                cb.failures = 0;
                return true;
            }
            return false; // Circuit open
        }
        return true;
    }

    /**
     * Record circuit breaker failure
     */
    recordCircuitFailure(provider) {
        const cb = this.circuitBreakers[provider];
        if (!cb) return;

        cb.failures++;
        cb.lastFail = Date.now();
        if (cb.failures >= this.circuitThreshold) {
            cb.state = 'open';
            console.warn(`[ModelRouter] Circuit breaker opened for ${provider}`);
        }
    }

    /**
     * Record circuit breaker success
     */
    recordCircuitSuccess(provider) {
        const cb = this.circuitBreakers[provider];
        if (!cb) return;

        if (cb.state === 'half-open') {
            cb.state = 'closed';
            cb.failures = 0;
            console.log(`[ModelRouter] Circuit breaker closed for ${provider}`);
        }
    }

    /**
     * Hash prompt for caching
     */
    hashPrompt(prompt) {
        return crypto.createHash('md5').update(prompt).digest('hex');
    }
}

export default ModelRouter;
