/**
 * Social Publisher - Multi-platform content publishing
 * Handles posting to social media, scheduling, and content management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import for puppeteer
let puppeteer = null;

export class SocialPublisher {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/social');
        this.screenshotsDir = path.join(this.dataDir, 'screenshots');
        this.headless = config.headless !== false;
        this.browser = null;
        this.page = null;

        // Platform configurations
        this.platforms = {
            twitter: {
                loginUrl: 'https://twitter.com/login',
                postUrl: 'https://twitter.com/compose/tweet',
                postAction: this.postToTwitter.bind(this)
            },
            instagram: {
                loginUrl: 'https://www.instagram.com/accounts/login/',
                postAction: this.postToInstagram.bind(this)
            },
            linkedin: {
                loginUrl: 'https://www.linkedin.com/login',
                postUrl: 'https://www.linkedin.com/feed/',
                postAction: this.postToLinkedIn.bind(this)
            },
            facebook: {
                loginUrl: 'https://www.facebook.com/login',
                postAction: this.postToFacebook.bind(this)
            }
        };

        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.screenshotsDir)) {
            fs.mkdirSync(this.screenshotsDir, { recursive: true });
        }
    }

    /**
     * Initialize browser
     */
    async initBrowser() {
        if (!puppeteer) {
            try {
                puppeteer = (await import('puppeteer')).default;
            } catch (error) {
                throw new Error('Puppeteer not installed. Run: npm install puppeteer');
            }
        }

        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: this.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.page = await this.browser.newPage();
            await this.page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            );
            await this.page.setViewport({ width: 1280, height: 800 });
        }
    }

    /**
     * Close browser
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * Login to a platform
     */
    async login(platform, credentials) {
        const config = this.platforms[platform];
        if (!config) {
            return { success: false, error: `Unknown platform: ${platform}` };
        }

        try {
            await this.initBrowser();
            await this.page.goto(config.loginUrl, { waitUntil: 'networkidle2' });
            await this.sleep(2000);

            switch (platform) {
                case 'twitter':
                    await this.loginTwitter(credentials);
                    break;
                case 'instagram':
                    await this.loginInstagram(credentials);
                    break;
                case 'linkedin':
                    await this.loginLinkedIn(credentials);
                    break;
                case 'facebook':
                    await this.loginFacebook(credentials);
                    break;
            }

            // Take screenshot to verify
            const ssPath = path.join(this.screenshotsDir, `${platform}-login-${Date.now()}.png`);
            await this.page.screenshot({ path: ssPath });

            return { success: true, screenshotPath: ssPath };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Twitter login
     */
    async loginTwitter(credentials) {
        await this.page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
        await this.page.type('input[autocomplete="username"]', credentials.username, { delay: 50 });
        await this.page.click('div[role="button"]:has-text("Next")').catch(() => { });
        await this.page.keyboard.press('Enter');
        await this.sleep(2000);

        await this.page.waitForSelector('input[name="password"]', { timeout: 10000 });
        await this.page.type('input[name="password"]', credentials.password, { delay: 50 });
        await this.page.keyboard.press('Enter');
        await this.sleep(3000);
    }

    /**
     * Instagram login
     */
    async loginInstagram(credentials) {
        await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
        await this.page.type('input[name="username"]', credentials.username, { delay: 50 });
        await this.page.type('input[name="password"]', credentials.password, { delay: 50 });
        await this.page.click('button[type="submit"]');
        await this.sleep(5000);
    }

    /**
     * LinkedIn login
     */
    async loginLinkedIn(credentials) {
        await this.page.waitForSelector('#username', { timeout: 10000 });
        await this.page.type('#username', credentials.username, { delay: 50 });
        await this.page.type('#password', credentials.password, { delay: 50 });
        await this.page.click('button[type="submit"]');
        await this.sleep(3000);
    }

    /**
     * Facebook login
     */
    async loginFacebook(credentials) {
        await this.page.waitForSelector('#email', { timeout: 10000 });
        await this.page.type('#email', credentials.username, { delay: 50 });
        await this.page.type('#pass', credentials.password, { delay: 50 });
        await this.page.click('button[name="login"]');
        await this.sleep(3000);
    }

    /**
     * Post content to a platform
     */
    async post(platform, content, credentials = null) {
        const config = this.platforms[platform];
        if (!config) {
            return { success: false, error: `Unknown platform: ${platform}` };
        }

        try {
            await this.initBrowser();

            // Login if credentials provided
            if (credentials) {
                await this.login(platform, credentials);
            }

            // Execute platform-specific post action
            const result = await config.postAction(content);

            // Save post record
            const postRecord = {
                id: `post-${Date.now()}`,
                platform,
                content: content.text,
                mediaUrls: content.mediaUrls || [],
                postedAt: new Date().toISOString(),
                result
            };

            const postsFile = path.join(this.dataDir, 'posts.jsonl');
            fs.appendFileSync(postsFile, JSON.stringify(postRecord) + '\n');

            return result;

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Post to Twitter
     */
    async postToTwitter(content) {
        try {
            // Navigate to compose
            await this.page.goto('https://twitter.com/compose/tweet', { waitUntil: 'networkidle2' });
            await this.sleep(2000);

            // Find tweet box
            const tweetBox = await this.page.$('div[role="textbox"]');
            if (tweetBox) {
                await tweetBox.click();
                await this.page.keyboard.type(content.text, { delay: 30 });
            }

            await this.sleep(1000);

            // Click tweet button
            await this.page.click('div[data-testid="tweetButton"]').catch(() => {
                // Try alternate selector
                this.page.click('div[role="button"]:has-text("Post")');
            });

            await this.sleep(3000);

            const ssPath = path.join(this.screenshotsDir, `twitter-post-${Date.now()}.png`);
            await this.page.screenshot({ path: ssPath });

            return { success: true, platform: 'twitter', screenshotPath: ssPath };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Post to Instagram (Story or DM, feed posts require mobile)
     */
    async postToInstagram(content) {
        // Note: Instagram doesn't allow feed posts from desktop
        // This attempts to share via DM or story
        try {
            await this.page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });
            await this.sleep(2000);

            const ssPath = path.join(this.screenshotsDir, `instagram-${Date.now()}.png`);
            await this.page.screenshot({ path: ssPath });

            return {
                success: false,
                error: 'Instagram feed posts require mobile app or API integration',
                screenshotPath: ssPath
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Post to LinkedIn
     */
    async postToLinkedIn(content) {
        try {
            await this.page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2' });
            await this.sleep(2000);

            // Click "Start a post"
            await this.page.click('button.share-box-feed-entry__trigger').catch(() => { });
            await this.sleep(1000);

            // Type content
            const textArea = await this.page.$('div.ql-editor');
            if (textArea) {
                await textArea.click();
                await this.page.keyboard.type(content.text, { delay: 30 });
            }

            await this.sleep(1000);

            // Click Post button
            await this.page.click('button.share-actions__primary-action').catch(() => { });
            await this.sleep(3000);

            const ssPath = path.join(this.screenshotsDir, `linkedin-post-${Date.now()}.png`);
            await this.page.screenshot({ path: ssPath });

            return { success: true, platform: 'linkedin', screenshotPath: ssPath };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Post to Facebook
     */
    async postToFacebook(content) {
        try {
            await this.page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });
            await this.sleep(2000);

            // Click "What's on your mind"
            await this.page.click('div[role="button"]:has-text("What\'s on your mind")').catch(() => { });
            await this.sleep(1000);

            // Type content
            const textArea = await this.page.$('div[role="textbox"]');
            if (textArea) {
                await textArea.click();
                await this.page.keyboard.type(content.text, { delay: 30 });
            }

            await this.sleep(1000);

            // Click Post
            await this.page.click('div[aria-label="Post"]').catch(() => { });
            await this.sleep(3000);

            const ssPath = path.join(this.screenshotsDir, `facebook-post-${Date.now()}.png`);
            await this.page.screenshot({ path: ssPath });

            return { success: true, platform: 'facebook', screenshotPath: ssPath };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Schedule a post
     */
    schedulePost(platform, content, scheduledTime) {
        const scheduled = {
            id: `scheduled-${Date.now()}`,
            platform,
            content,
            scheduledTime,
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };

        const scheduledFile = path.join(this.dataDir, 'scheduled-posts.json');
        let scheduledPosts = [];
        if (fs.existsSync(scheduledFile)) {
            scheduledPosts = JSON.parse(fs.readFileSync(scheduledFile, 'utf-8'));
        }
        scheduledPosts.push(scheduled);
        fs.writeFileSync(scheduledFile, JSON.stringify(scheduledPosts, null, 2));

        return { success: true, scheduled };
    }

    /**
     * Get scheduled posts
     */
    getScheduledPosts() {
        const scheduledFile = path.join(this.dataDir, 'scheduled-posts.json');
        if (!fs.existsSync(scheduledFile)) return [];
        return JSON.parse(fs.readFileSync(scheduledFile, 'utf-8'));
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
            case 'login':
                return this.login(task.data.platform, task.data.credentials);
            case 'post':
                return this.post(task.data.platform, task.data.content, task.data.credentials);
            case 'schedule':
                return this.schedulePost(task.data.platform, task.data.content, task.data.scheduledTime);
            case 'scheduled':
                return this.getScheduledPosts();
            case 'close':
                await this.closeBrowser();
                return { success: true };
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default SocialPublisher;
