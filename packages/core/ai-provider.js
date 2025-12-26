/**
 * AI Provider - Abstraction layer for AI model access
 * Supports Ollama (local), OpenAI, and DeepSeek APIs
 */

export class AIProvider {
    constructor(config = {}) {
        this.provider = config.provider || 'ollama';
        this.ollamaUrl = config.ollamaUrl || process.env.OLLAMA_URL || process.env.PRIVATE_AI_URL || 'http://localhost:11434';
        this.openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
        this.deepseekKey = config.deepseekKey || process.env.DEEPSEEK_API_KEY;
        this.geminiKey = config.geminiKey || process.env.GEMINI_API_KEY;

        // Default models per provider
        this.models = {
            ollama: {
                reasoning: config.ollamaReasoningModel || 'deepseek-r1:1.5b',
                coding: config.ollamaCodingModel || 'deepseek-r1:1.5b',
                fast: config.ollamaFastModel || 'llama3.2:1b'
            },
            openai: {
                reasoning: 'gpt-4-turbo',
                coding: 'gpt-4-turbo',
                fast: 'gpt-3.5-turbo'
            },
            deepseek: {
                reasoning: 'deepseek-reasoner',
                coding: 'deepseek-coder',
                fast: 'deepseek-chat'
            },
            gemini: {
                reasoning: 'gemini-1.5-pro',
                coding: 'gemini-1.5-pro',
                fast: 'gemini-1.5-flash'
            }
        };
    }

    /**
     * Generate a completion from the AI
     * @param {string} prompt - The prompt to send
     * @param {string} type - 'reasoning', 'coding', or 'fast'
     * @param {object} options - Optional parameters (e.g., { format: 'json' })
     */
    async complete(prompt, type = 'fast', options = {}) {
        const model = this.models[this.provider]?.[type] || this.models[this.provider]?.fast;

        switch (this.provider) {
            case 'ollama':
                return this.ollamaComplete(prompt, model, options);
            case 'openai':
                return this.openaiComplete(prompt, model, options);
            case 'deepseek':
                return this.deepseekComplete(prompt, model, options);
            case 'gemini':
                return this.geminiComplete(prompt, model, options);
            default:
                throw new Error(`Unknown provider: ${this.provider}`);
        }
    }

    /**
     * Extract reasoning from DeepSeek R1 output
     * DeepSeek R1 outputs reasoning in <think>...</think> tags
     * @param {string} content - Raw AI output
     * @returns {{reasoning: string|null, answer: string}} Parsed output
     */
    extractReasoning(content) {
        if (!content) return { reasoning: null, answer: '' };

        const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
            const reasoning = thinkMatch[1].trim();
            const answer = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
            return { reasoning, answer };
        }

        return { reasoning: null, answer: content };
    }

    /**
     * Ollama local completion
     */
    async ollamaComplete(prompt, model, options = {}) {
        let attempts = 0;
        const maxAttempts = 3;
        let currentModel = model;
        const TIMEOUT_MS = 300000; // 300 second (5 min) timeout for slower local models

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                const body = {
                    model: currentModel,
                    prompt,
                    stream: false
                };

                // Add format: 'json' if requested
                if (options.format === 'json') {
                    body.format = 'json';
                }

                const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Ollama error: ${response.statusText}`);
                }

                const data = await response.json();
                const { reasoning, answer } = this.extractReasoning(data.response);

                return {
                    success: true,
                    content: answer || data.response,
                    reasoning,
                    rawContent: data.response,
                    model: currentModel,
                    provider: 'ollama'
                };
            } catch (error) {
                console.error(`Ollama attempt ${attempts} failed (${currentModel}):`, error.message);

                const isConnectionError = error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED');

                // Fallback to SIMULATED mode if all mechanics fail or connection refused
                if (attempts === maxAttempts || isConnectionError) {
                    console.log(`⚠️ ${isConnectionError ? 'Ollama connection refused' : 'Critical AI failure'}. Switching to SIMULATED (Heuristic) Mode.`);
                    return this.simulatedComplete(prompt);
                }

                // Fallback to fast model on retry if reasoning model failed
                if (currentModel !== this.models.ollama.fast) {
                    console.log(`🔄 Switching to fast model (${this.models.ollama.fast}) for retry...`);
                    currentModel = this.models.ollama.fast;
                }

                // Wait small delay
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }

    /**
     * Simulated (Heuristic) Completion
     * Used when no AI models are available to keep the system running.
     */
    simulatedComplete(prompt) {
        let content = '';
        const lowerPrompt = prompt.toLowerCase();

        // Heuristics based on prompt keywords (case-insensitive)
        if (lowerPrompt.includes('analyze this business idea')) {
            console.log('[SimulatedAI] Matched: Business Analysis');
            content = JSON.stringify({
                viability: { score: 9, reasoning: 'Strong market fit and low overhead.' },
                marketAnalysis: {
                    targetAudience: 'Global users',
                    marketSize: 'Growing/Large',
                    competition: 'Moderate',
                    differentiator: 'AI-driven efficiency'
                },
                revenueModel: {
                    primary: 'Subscription',
                    secondary: ['Consulting'],
                    pricingStrategy: 'Tiered pricing'
                },
                requiredSystems: [
                    { name: 'Core Engine', purpose: 'Primary logic', priority: 'high' }
                ],
                estimatedCosts: { startup: '$500', monthly: '$50' },
                risks: [{ risk: 'Market changes', mitigation: 'Stay agile' }],
                timeline: { mvp: '2 weeks', profitable: '3 months' },
                immediateNextSteps: ['Define MVP', 'Register domain']
            });
        } else if (lowerPrompt.includes('execution plan') || lowerPrompt.includes('business plan')) {
            console.log('[SimulatedAI] Matched: Business Plan');
            content = JSON.stringify({
                executiveSummary: "A scalable AI-driven business optimized for efficiency.",
                mission: "To automate and simplify complex processes for our users.",
                vision: "Become the industry standard for AI-integrated services.",
                phases: [
                    {
                        name: 'Setup',
                        duration: '1 week',
                        objectives: ['Infrastructure readiness'],
                        tasks: [
                            { name: 'Register domain', description: 'Acquire domain name', automated: true, requiresApproval: false, estimatedTime: '1 hour', dependencies: [] },
                            { name: 'Setup branding', description: 'Create logo and style', automated: false, requiresApproval: true, approvalReason: 'Brand identity review', estimatedTime: '3 hours', dependencies: [] }
                        ],
                        milestones: ['Systems live'],
                        budget: '$100'
                    },
                    {
                        name: 'Launch',
                        duration: '2 weeks',
                        objectives: ['Go to market'],
                        tasks: [
                            { name: 'Create landing page', description: 'Deploy Vercel site', automated: true, requiresApproval: false, estimatedTime: '2 hours', dependencies: ['Register domain'] },
                            { name: 'Cold outreach', description: 'Initial sales push', automated: true, requiresApproval: false, estimatedTime: '4 hours', dependencies: ['Create landing page'] }
                        ],
                        milestones: ['First customer'],
                        budget: '$200'
                    }
                ],
                automationOpportunities: [{ area: 'Outreach', benefit: 'Scale', complexity: 'low' }],
                legalRequirements: [{ requirement: 'LLC', when: 'At launch', cost: '$150' }],
                financialProjections: {
                    month1: { revenue: 500, expenses: 300 },
                    month3: { revenue: 2000, expenses: 500 },
                    month6: { revenue: 5000, expenses: 1000 },
                    month12: { revenue: 15000, expenses: 3000 }
                },
                kpis: ['Conversion rate', 'ARPU', 'Churn rate'],
                successCriteria: "LTV > 3x CAC"
            });
        } else if (lowerPrompt.includes('generate')) {
            console.log('[SimulatedAI] Matched: Generic Generate');
            content = "Here is the generated content for your request.";
        } else {
            console.log('[SimulatedAI] No match, using default fallback response');
            content = "Fallback response: The system recorded the request and responded with a safe local fallback.";
        }

        return {
            success: true,
            content,
            reasoning: "Local fallback responder produced this output due to external LLM unavailability.",
            model: 'simulation-engine',
            provider: 'fallback'
        };
    }

    /**
     * OpenAI API completion
     */
    async openaiComplete(prompt, model) {
        if (!this.openaiKey) {
            return { success: false, error: 'OpenAI API key not configured' };
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'OpenAI API error');
            }

            return {
                success: true,
                content: data.choices[0]?.message?.content,
                model,
                provider: 'openai'
            };
        } catch (error) {
            return { success: false, error: error.message, provider: 'openai' };
        }
    }

    /**
     * DeepSeek API completion (free tier available)
     */
    async deepseekComplete(prompt, model) {
        if (!this.deepseekKey) {
            return { success: false, error: 'DeepSeek API key not configured' };
        }

        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.deepseekKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'DeepSeek API error');
            }

            return {
                success: true,
                content: data.choices[0]?.message?.content,
                model,
                provider: 'deepseek'
            };
        } catch (error) {
            return { success: false, error: error.message, provider: 'deepseek' };
        }
    }

    /**
     * Gemini API completion
     */
    async geminiComplete(prompt, model) {
        if (!this.geminiKey) {
            return { success: false, error: 'Gemini API key not configured' };
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Gemini API error');
            }

            return {
                success: true,
                content: data.candidates[0]?.content?.parts[0]?.text,
                model,
                provider: 'gemini'
            };
        } catch (error) {
            return { success: false, error: error.message, provider: 'gemini' };
        }
    }

    /**
     * Check if Ollama is available
     */
    async checkOllama() {
        try {
            const response = await fetch(`${this.ollamaUrl}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                return {
                    available: true,
                    models: data.models?.map(m => m.name) || []
                };
            }
            return { available: false };
        } catch {
            return { available: false };
        }
    }

    /**
     * Generate a structured analysis/summary
     */
    async analyze(content, instruction) {
        const prompt = `${instruction}\n\nContent:\n${content}\n\nProvide your analysis:`;
        return this.complete(prompt, 'reasoning');
    }

    /**
     * Generate code
     */
    async generateCode(description, language = 'javascript') {
        const prompt = `Generate ${language} code for the following:\n${description}\n\nProvide only the code, no explanations:`;
        return this.complete(prompt, 'coding');
    }
}

export default AIProvider;
