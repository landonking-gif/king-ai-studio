/**
 * Anti-Block System - Evades rate limits, CAPTCHAs, and verification
 * Provides proxy rotation, human-like behavior, and workarounds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AntiBlockSystem {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/antiblock');
        this.ensureDataDir();

        // Proxy configuration
        this.proxies = this.loadProxies();
        this.currentProxyIndex = 0;

        // CAPTCHA solving services
        this.captchaServices = {
            '2captcha': {
                apiKey: process.env.TWOCAPTCHA_API_KEY,
                solveUrl: 'http://2captcha.com/in.php',
                resultUrl: 'http://2captcha.com/res.php'
            },
            'capsolver': {
                apiKey: process.env.CAPSOLVER_API_KEY,
                solveUrl: 'https://api.capsolver.com/createTask'
            },
            'anticaptcha': {
                apiKey: process.env.ANTICAPTCHA_API_KEY,
                solveUrl: 'https://api.anti-captcha.com/createTask'
            }
        };

        // SMS verification services  
        this.smsServices = {
            'smspva': {
                apiKey: process.env.SMSPVA_API_KEY,
                baseUrl: 'http://smspva.com/priemnik.php'
            },
            'smsactivate': {
                apiKey: process.env.SMS_ACTIVATE_API_KEY,
                baseUrl: 'https://api.sms-activate.org/stubs/handler_api.php'
            }
        };

        // Human-like behavior patterns
        this.behaviorPatterns = {
            typing: { min: 50, max: 150 }, // ms per character
            click: { min: 100, max: 500 },
            scroll: { min: 500, max: 2000 },
            pageLoad: { min: 2000, max: 5000 },
            formFill: { min: 1000, max: 3000 }
        };
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Load proxy list from file or env
     */
    loadProxies() {
        const proxiesFile = path.join(this.dataDir, 'proxies.txt');

        // Check environment first
        if (process.env.PROXY_LIST) {
            return process.env.PROXY_LIST.split(',').map(p => p.trim());
        }

        // Check file
        if (fs.existsSync(proxiesFile)) {
            const content = fs.readFileSync(proxiesFile, 'utf-8');
            return content.split('\n').map(p => p.trim()).filter(p => p);
        }

        // Return empty - will use direct connection
        return [];
    }

    /**
     * Get next proxy with rotation
     */
    getNextProxy() {
        if (this.proxies.length === 0) return null;

        const proxy = this.proxies[this.currentProxyIndex];
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;

        return this.parseProxy(proxy);
    }

    /**
     * Parse proxy string into config object
     */
    parseProxy(proxyString) {
        // Format: protocol://user:pass@host:port or host:port
        if (!proxyString) return null;

        try {
            if (proxyString.includes('://')) {
                const url = new URL(proxyString);
                return {
                    host: url.hostname,
                    port: parseInt(url.port),
                    protocol: url.protocol.replace(':', ''),
                    username: url.username || undefined,
                    password: url.password || undefined
                };
            } else {
                const [hostPort, credentials] = proxyString.split('@').reverse();
                const [host, port] = hostPort.split(':');
                const [username, password] = credentials?.split(':') || [];
                return { host, port: parseInt(port), username, password };
            }
        } catch (error) {
            console.error('[AntiBlock] Failed to parse proxy:', proxyString);
            return null;
        }
    }

    /**
     * Apply proxy to Puppeteer launch args
     */
    getPuppeteerArgs(proxy) {
        if (!proxy) return [];
        return [`--proxy-server=${proxy.host}:${proxy.port}`];
    }

    /**
     * Get random delay for human-like behavior
     */
    getDelay(type = 'click') {
        const pattern = this.behaviorPatterns[type] || { min: 100, max: 500 };
        return Math.floor(Math.random() * (pattern.max - pattern.min)) + pattern.min;
    }

    /**
     * Type with human-like delays
     */
    async typeHuman(page, selector, text) {
        await page.waitForSelector(selector);
        await page.click(selector);
        await this.sleep(this.getDelay('click'));

        for (const char of text) {
            await page.keyboard.type(char);
            await this.sleep(this.getDelay('typing'));
        }
    }

    /**
     * Click with human-like delay
     */
    async clickHuman(page, selector) {
        await page.waitForSelector(selector);
        await this.sleep(this.getDelay('click'));
        await page.click(selector);
    }

    /**
     * Random mouse movement
     */
    async randomMouseMove(page) {
        const viewport = page.viewport();
        const x = Math.floor(Math.random() * (viewport?.width || 1280));
        const y = Math.floor(Math.random() * (viewport?.height || 800));
        await page.mouse.move(x, y);
    }

    /**
     * Solve reCAPTCHA using 2Captcha
     */
    async solveCaptcha(siteKey, pageUrl, type = 'recaptcha') {
        const service = this.captchaServices['2captcha'];
        if (!service.apiKey) {
            return { success: false, error: 'No 2Captcha API key configured' };
        }

        try {
            // Submit captcha
            const submitUrl = `${service.solveUrl}?key=${service.apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
            const submitRes = await fetch(submitUrl);
            const submitData = await submitRes.json();

            if (submitData.status !== 1) {
                return { success: false, error: submitData.request };
            }

            const requestId = submitData.request;

            // Poll for result
            for (let i = 0; i < 30; i++) {
                await this.sleep(5000);

                const resultUrl = `${service.resultUrl}?key=${service.apiKey}&action=get&id=${requestId}&json=1`;
                const resultRes = await fetch(resultUrl);
                const resultData = await resultRes.json();

                if (resultData.status === 1) {
                    return { success: true, solution: resultData.request };
                }

                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }

            return { success: false, error: 'Timeout waiting for CAPTCHA solution' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a virtual phone number for SMS verification
     */
    async getPhoneNumber(country = 'US', service = 'google') {
        const smsService = this.smsServices['smsactivate'];
        if (!smsService.apiKey) {
            return { success: false, error: 'No SMS service API key configured' };
        }

        try {
            const serviceCode = {
                google: 'go',
                twitter: 'tw',
                instagram: 'ig',
                facebook: 'fb',
                linkedin: 'li'
            }[service] || 'ot';

            const countryCode = {
                US: 12,
                UK: 16,
                CA: 36
            }[country] || 12;

            const url = `${smsService.baseUrl}?api_key=${smsService.apiKey}&action=getNumber&service=${serviceCode}&country=${countryCode}`;
            const response = await fetch(url);
            const text = await response.text();

            if (text.startsWith('ACCESS_NUMBER')) {
                const [, id, number] = text.split(':');
                return {
                    success: true,
                    id,
                    number: `+${number}`,
                    service: 'smsactivate'
                };
            }

            return { success: false, error: text };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get SMS code from virtual number
     */
    async getSmsCode(activationId, maxWaitSeconds = 120) {
        const smsService = this.smsServices['smsactivate'];
        if (!smsService.apiKey) {
            return { success: false, error: 'No SMS service API key configured' };
        }

        const startTime = Date.now();
        const maxWaitMs = maxWaitSeconds * 1000;

        while (Date.now() - startTime < maxWaitMs) {
            try {
                const url = `${smsService.baseUrl}?api_key=${smsService.apiKey}&action=getStatus&id=${activationId}`;
                const response = await fetch(url);
                const text = await response.text();

                if (text.startsWith('STATUS_OK')) {
                    const code = text.split(':')[1];
                    return { success: true, code };
                }

                if (text === 'STATUS_WAIT_CODE') {
                    await this.sleep(5000);
                    continue;
                }

                return { success: false, error: text };

            } catch (error) {
                await this.sleep(5000);
            }
        }

        return { success: false, error: 'Timeout waiting for SMS code' };
    }

    /**
     * Generate random user agent
     */
    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    /**
     * Setup stealth for Puppeteer page
     */
    async applyStealthMode(page) {
        // Override navigator properties
        await page.evaluateOnNewDocument(() => {
            // Hide webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

            // Realistic plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' }
                ]
            });

            // Languages
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

            // Hardware concurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

            // Platform
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        });

        // Set realistic viewport
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1
        });
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
            case 'get_proxy':
                return { success: true, proxy: this.getNextProxy() };
            case 'solve_captcha':
                return this.solveCaptcha(task.data.siteKey, task.data.pageUrl);
            case 'get_phone':
                return this.getPhoneNumber(task.data.country, task.data.service);
            case 'get_sms_code':
                return this.getSmsCode(task.data.activationId, task.data.timeout);
            case 'get_user_agent':
                return { success: true, userAgent: this.getRandomUserAgent() };
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default AntiBlockSystem;
