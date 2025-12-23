/**
 * Market Research Engine - Deep research with real-time data and trends
 * Accesses Google Trends, news APIs, social media trends, and market data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MarketResearch {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/research');
        this.cacheDir = path.join(this.dataDir, 'cache');
        this.ensureDirectories();

        this.modelRouter = config.modelRouter || new ModelRouter();

        // API configurations
        this.apis = {
            serper: process.env.SERPER_API_KEY, // Google Search API
            newsApi: process.env.NEWS_API_KEY,
            alphaVantage: process.env.ALPHA_VANTAGE_API_KEY, // Stock/market data
            rapidApi: process.env.RAPIDAPI_KEY // Various APIs
        };

        // Cache settings (hours)
        this.cacheTTL = {
            trends: 6,
            news: 1,
            competitors: 24,
            market: 12
        };
    }

    ensureDirectories() {
        for (const dir of [this.dataDir, this.cacheDir]) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    /**
     * Check cache for data
     */
    getCache(key, ttlHours) {
        const cacheFile = path.join(this.cacheDir, `${key}.json`);
        if (!fs.existsSync(cacheFile)) return null;

        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        const age = (Date.now() - cached.timestamp) / (1000 * 60 * 60);

        if (age > ttlHours) return null;
        return cached.data;
    }

    /**
     * Set cache
     */
    setCache(key, data) {
        const cacheFile = path.join(this.cacheDir, `${key}.json`);
        fs.writeFileSync(cacheFile, JSON.stringify({
            timestamp: Date.now(),
            data
        }, null, 2));
    }

    /**
     * Web search using Serper (Google Search API)
     */
    async webSearch(query, options = {}) {
        // Check cache
        const cacheKey = `search-${Buffer.from(query).toString('base64').substring(0, 20)}`;
        const cached = this.getCache(cacheKey, 6);
        if (cached) return cached;

        if (this.apis.serper) {
            try {
                const response = await fetch('https://google.serper.dev/search', {
                    method: 'POST',
                    headers: {
                        'X-API-KEY': this.apis.serper,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        q: query,
                        num: options.count || 10
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const results = {
                        organic: data.organic?.map(r => ({
                            title: r.title,
                            link: r.link,
                            snippet: r.snippet
                        })) || [],
                        relatedSearches: data.relatedSearches || [],
                        answerBox: data.answerBox || null
                    };
                    this.setCache(cacheKey, results);
                    return results;
                }
            } catch (error) {
                console.log('[MarketResearch] Serper API error:', error.message);
            }
        }

        // Fallback: use AI to simulate research
        return this.aiResearchFallback(query);
    }

    /**
     * Get Google Trends data
     */
    async getTrends(keywords, options = {}) {
        const cacheKey = `trends-${keywords.join('-').substring(0, 30)}`;
        const cached = this.getCache(cacheKey, this.cacheTTL.trends);
        if (cached) return cached;

        // Try RapidAPI Google Trends
        if (this.apis.rapidApi) {
            try {
                const response = await fetch(`https://google-trends8.p.rapidapi.com/trendings?region_code=${options.region || 'US'}&hl=en-US`, {
                    headers: {
                        'X-RapidAPI-Key': this.apis.rapidApi,
                        'X-RapidAPI-Host': 'google-trends8.p.rapidapi.com'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.setCache(cacheKey, data);
                    return data;
                }
            } catch (error) {
                console.log('[MarketResearch] Trends API error:', error.message);
            }
        }

        // Fallback: AI estimation
        return this.aiTrendsFallback(keywords);
    }

    /**
     * Get news about a topic
     */
    async getNews(topic, options = {}) {
        const cacheKey = `news-${Buffer.from(topic).toString('base64').substring(0, 20)}`;
        const cached = this.getCache(cacheKey, this.cacheTTL.news);
        if (cached) return cached;

        if (this.apis.newsApi) {
            try {
                const response = await fetch(
                    `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&pageSize=20&apiKey=${this.apis.newsApi}`
                );

                if (response.ok) {
                    const data = await response.json();
                    const results = {
                        articles: data.articles?.map(a => ({
                            title: a.title,
                            source: a.source?.name,
                            url: a.url,
                            publishedAt: a.publishedAt,
                            description: a.description
                        })) || [],
                        totalResults: data.totalResults
                    };
                    this.setCache(cacheKey, results);
                    return results;
                }
            } catch (error) {
                console.log('[MarketResearch] News API error:', error.message);
            }
        }

        // Fallback
        return { articles: [], fallback: true };
    }

    /**
     * Analyze competitors
     */
    async analyzeCompetitors(businessType, options = {}) {
        const cacheKey = `competitors-${Buffer.from(businessType).toString('base64').substring(0, 20)}`;
        const cached = this.getCache(cacheKey, this.cacheTTL.competitors);
        if (cached) return cached;

        // Search for competitors
        const searchResults = await this.webSearch(`top ${businessType} companies competitors`);

        // Use AI to analyze
        const prompt = `Analyze the competitive landscape for: ${businessType}

Use these search results as context:
${JSON.stringify(searchResults.organic?.slice(0, 5), null, 2)}

Provide a detailed competitive analysis including:
1. Top 5 competitors with their strengths/weaknesses
2. Market positioning opportunities
3. Price range analysis
4. Differentiation strategies
5. Barriers to entry

Return as JSON:
{
  "competitors": [{"name": "", "strengths": [], "weaknesses": [], "priceRange": ""}],
  "opportunities": [],
  "threats": [],
  "recommendedPositioning": "",
  "estimatedMarketSize": ""
}`;

        const result = await this.modelRouter.complete(prompt, 'reasoning');

        if (result.success) {
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const analysis = JSON.parse(jsonMatch[0]);
                    this.setCache(cacheKey, analysis);
                    return analysis;
                }
            } catch (e) {
                // Return raw analysis
            }
        }

        return { analysis: result.content, fallback: true };
    }

    /**
     * Get market size and growth data
     */
    async getMarketData(industry) {
        const cacheKey = `market-${Buffer.from(industry).toString('base64').substring(0, 20)}`;
        const cached = this.getCache(cacheKey, this.cacheTTL.market);
        if (cached) return cached;

        // Search for market data
        const searchResults = await this.webSearch(`${industry} market size growth rate 2024 2025`);

        // AI analysis
        const prompt = `Analyze the market for: ${industry}

Search results for context:
${JSON.stringify(searchResults.organic?.slice(0, 5), null, 2)}

Provide comprehensive market analysis:
1. Estimated total addressable market (TAM)
2. Serviceable addressable market (SAM)  
3. Growth rate (CAGR)
4. Key trends driving growth
5. Potential disruptions
6. Best entry points

Return as JSON:
{
  "tam": {"value": "", "year": ""},
  "sam": {"value": "", "year": ""},
  "cagr": "",
  "trends": [],
  "disruptions": [],
  "entryPoints": [],
  "recommendation": ""
}`;

        const result = await this.modelRouter.complete(prompt, 'reasoning');

        if (result.success) {
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const data = JSON.parse(jsonMatch[0]);
                    this.setCache(cacheKey, data);
                    return data;
                }
            } catch (e) { }
        }

        return { analysis: result.content, fallback: true };
    }

    /**
     * Get social media trends
     */
    async getSocialTrends(platform = 'twitter', region = 'US') {
        const cacheKey = `social-${platform}-${region}`;
        const cached = this.getCache(cacheKey, 2);
        if (cached) return cached;

        if (this.apis.rapidApi) {
            try {
                // Twitter trends via RapidAPI
                if (platform === 'twitter') {
                    const response = await fetch(
                        'https://twitter154.p.rapidapi.com/trends/?woeid=23424977',
                        {
                            headers: {
                                'X-RapidAPI-Key': this.apis.rapidApi,
                                'X-RapidAPI-Host': 'twitter154.p.rapidapi.com'
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        this.setCache(cacheKey, data);
                        return data;
                    }
                }
            } catch (error) {
                console.log('[MarketResearch] Social trends API error:', error.message);
            }
        }

        return { trends: [], fallback: true };
    }

    /**
     * AI fallback for research
     */
    async aiResearchFallback(query) {
        const prompt = `You are a market research expert. Research this topic and provide comprehensive findings:

Topic: ${query}

Provide:
1. Key facts and statistics
2. Major players/companies
3. Recent developments
4. Market trends
5. Opportunities and challenges

Be specific with numbers and names where possible. If you don't have current data, provide your best estimates and note they are estimates.`;

        const result = await this.modelRouter.complete(prompt, 'reasoning');

        return {
            source: 'ai_analysis',
            query,
            findings: result.content,
            disclaimer: 'Data generated by AI - may not reflect current real-time information'
        };
    }

    /**
     * AI fallback for trends
     */
    async aiTrendsFallback(keywords) {
        const prompt = `Analyze trends for these keywords: ${keywords.join(', ')}

Provide analysis including:
1. Current popularity (1-100 scale)
2. Trend direction (rising/stable/declining)
3. Related trending topics
4. Seasonal patterns
5. Predicted future trend`;

        const result = await this.modelRouter.complete(prompt, 'reasoning');

        return {
            source: 'ai_estimation',
            keywords,
            analysis: result.content,
            disclaimer: 'Trend estimates based on AI analysis'
        };
    }

    /**
     * Deep research - combines all sources
     */
    async deepResearch(topic, options = {}) {
        console.log(`[MarketResearch] Starting deep research: ${topic}`);

        const results = {
            topic,
            timestamp: new Date().toISOString(),
            webSearch: null,
            news: null,
            competitors: null,
            marketData: null,
            trends: null,
            synthesis: null
        };

        // Run all research in parallel
        const [webSearch, news, competitors, marketData, trends] = await Promise.all([
            this.webSearch(topic).catch(e => ({ error: e.message })),
            this.getNews(topic).catch(e => ({ error: e.message })),
            this.analyzeCompetitors(topic, options).catch(e => ({ error: e.message })),
            this.getMarketData(topic).catch(e => ({ error: e.message })),
            this.getTrends([topic]).catch(e => ({ error: e.message }))
        ]);

        results.webSearch = webSearch;
        results.news = news;
        results.competitors = competitors;
        results.marketData = marketData;
        results.trends = trends;

        // Synthesize findings
        const synthesisPrompt = `You are a senior business analyst. Synthesize this research into actionable insights:

TOPIC: ${topic}

WEB SEARCH FINDINGS:
${JSON.stringify(webSearch?.organic?.slice(0, 3), null, 2)}

NEWS:
${JSON.stringify(news?.articles?.slice(0, 3), null, 2)}

COMPETITIVE ANALYSIS:
${JSON.stringify(competitors, null, 2)}

MARKET DATA:
${JSON.stringify(marketData, null, 2)}

Provide a synthesis with:
1. Executive Summary (2-3 sentences)
2. Key Opportunities
3. Critical Risks
4. Recommended Actions
5. Timeline recommendations
6. Investment recommendations

Be specific and actionable.`;

        const synthesis = await this.modelRouter.complete(synthesisPrompt, 'reasoning');
        results.synthesis = synthesis.content;

        // Save full report
        const reportFile = path.join(this.dataDir, `report-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

        console.log(`[MarketResearch] Deep research complete. Report saved.`);

        return results;
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'search':
                return this.webSearch(task.data.query, task.data.options);
            case 'trends':
                return this.getTrends(task.data.keywords, task.data.options);
            case 'news':
                return this.getNews(task.data.topic, task.data.options);
            case 'competitors':
                return this.analyzeCompetitors(task.data.businessType, task.data.options);
            case 'market':
                return this.getMarketData(task.data.industry);
            case 'social_trends':
                return this.getSocialTrends(task.data.platform, task.data.region);
            case 'deep':
                return this.deepResearch(task.data.topic, task.data.options);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default MarketResearch;
