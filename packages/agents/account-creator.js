/**
 * Account Creator - Automates account creation on various platforms
 * Uses browser automation to sign up for accounts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AccountManager } from '../integrations/account-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import for puppeteer
let puppeteer = null;

export class AccountCreator {
    constructor(config = {}) {
        this.accountManager = config.accountManager || new AccountManager(config);
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/accounts');
        this.headless = config.headless !== false;
        this.browser = null;
        this.page = null;

        // Platform configurations
        this.platforms = {
            gmail: {
                signupUrl: 'https://accounts.google.com/signup',
                steps: this.gmailSignupSteps.bind(this)
            },
            outlook: {
                signupUrl: 'https://outlook.live.com/owa/?nlp=1&signup=1',
                steps: this.outlookSignupSteps.bind(this)
            },
            twitter: {
                signupUrl: 'https://twitter.com/i/flow/signup',
                steps: this.twitterSignupSteps.bind(this)
            },
            instagram: {
                signupUrl: 'https://www.instagram.com/accounts/emailsignup/',
                steps: this.instagramSignupSteps.bind(this)
            },
            linkedin: {
                signupUrl: 'https://www.linkedin.com/signup',
                steps: this.linkedinSignupSteps.bind(this)
            }
        };

        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Initialize Puppeteer browser
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
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled'
                ]
            });
            this.page = await this.browser.newPage();

            // Set realistic user agent
            await this.page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
     * Generate random account details
     */
    generateAccountDetails(options = {}) {
        const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson'];

        const firstName = options.firstName || firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = options.lastName || lastNames[Math.floor(Math.random() * lastNames.length)];
        const randomNum = Math.floor(Math.random() * 9999);
        const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNum}`;

        // Generate a strong random password
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return {
            firstName,
            lastName,
            username,
            email: options.email || `${username}@tempmail.local`,
            password,
            birthDate: {
                month: Math.floor(Math.random() * 12) + 1,
                day: Math.floor(Math.random() * 28) + 1,
                year: 1985 + Math.floor(Math.random() * 15) // 1985-1999
            }
        };
    }

    /**
     * Create account on specified platform
     * @param {string} platform - Platform name (gmail, twitter, instagram, etc.)
     * @param {object} options - Account options
     */
    async createAccount(platform, options = {}) {
        const platformConfig = this.platforms[platform.toLowerCase()];
        if (!platformConfig) {
            return { success: false, error: `Unknown platform: ${platform}` };
        }

        const accountDetails = this.generateAccountDetails(options);

        console.log(`[AccountCreator] Creating ${platform} account for ${accountDetails.username}...`);

        try {
            await this.initBrowser();

            // Navigate to signup page
            await this.page.goto(platformConfig.signupUrl, { waitUntil: 'networkidle2' });
            await this.sleep(2000);

            // Execute platform-specific signup steps
            const result = await platformConfig.steps(accountDetails);

            if (result.success) {
                // Save to AccountManager
                await this.accountManager.addAccount(platform, {
                    username: accountDetails.username,
                    email: accountDetails.email,
                    password: accountDetails.password,
                    ...result.additionalData
                });

                // Take screenshot as proof
                const screenshotPath = path.join(this.dataDir, `${platform}-${accountDetails.username}.png`);
                await this.page.screenshot({ path: screenshotPath });

                console.log(`[AccountCreator] Successfully created ${platform} account: ${accountDetails.username}`);

                return {
                    success: true,
                    platform,
                    username: accountDetails.username,
                    email: accountDetails.email,
                    screenshotPath
                };
            }

            return result;

        } catch (error) {
            console.error(`[AccountCreator] Failed to create ${platform} account:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Gmail signup steps
     */
    async gmailSignupSteps(details) {
        try {
            // Fill first name
            await this.page.waitForSelector('input[name="firstName"]', { timeout: 10000 });
            await this.page.type('input[name="firstName"]', details.firstName, { delay: 50 });
            await this.page.type('input[name="lastName"]', details.lastName, { delay: 50 });
            await this.page.click('button[type="button"]'); // Next
            await this.sleep(2000);

            // Fill birthday
            await this.page.waitForSelector('input[name="day"]', { timeout: 10000 });
            await this.page.select('#month', details.birthDate.month.toString());
            await this.page.type('input[name="day"]', details.birthDate.day.toString());
            await this.page.type('input[name="year"]', details.birthDate.year.toString());
            await this.page.select('#gender', '3'); // Prefer not to say
            await this.page.click('button[type="button"]'); // Next
            await this.sleep(2000);

            // Create email
            await this.page.waitForSelector('input[name="Username"]', { timeout: 10000 });
            await this.page.type('input[name="Username"]', details.username, { delay: 50 });
            await this.page.click('button[type="button"]'); // Next
            await this.sleep(2000);

            // Password
            await this.page.waitForSelector('input[name="Passwd"]', { timeout: 10000 });
            await this.page.type('input[name="Passwd"]', details.password, { delay: 50 });
            await this.page.type('input[name="PasswdAgain"]', details.password, { delay: 50 });
            await this.page.click('button[type="button"]'); // Next

            // Note: Gmail will likely require phone verification at this point
            return {
                success: true,
                requiresVerification: true,
                additionalData: { email: `${details.username}@gmail.com` }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Outlook signup steps
     */
    async outlookSignupSteps(details) {
        try {
            await this.page.waitForSelector('input[id="MemberName"]', { timeout: 10000 });
            await this.page.type('input[id="MemberName"]', details.username, { delay: 50 });
            await this.page.click('input[id="iSignupAction"]');
            await this.sleep(2000);

            // Password
            await this.page.waitForSelector('input[id="PasswordInput"]', { timeout: 10000 });
            await this.page.type('input[id="PasswordInput"]', details.password, { delay: 50 });
            await this.page.click('input[id="iSignupAction"]');
            await this.sleep(2000);

            // Name
            await this.page.waitForSelector('input[id="FirstName"]', { timeout: 10000 });
            await this.page.type('input[id="FirstName"]', details.firstName, { delay: 50 });
            await this.page.type('input[id="LastName"]', details.lastName, { delay: 50 });
            await this.page.click('input[id="iSignupAction"]');

            return {
                success: true,
                requiresVerification: true,
                additionalData: { email: `${details.username}@outlook.com` }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Twitter signup steps
     */
    async twitterSignupSteps(details) {
        try {
            await this.page.waitForSelector('input[name="name"]', { timeout: 15000 });
            await this.page.type('input[name="name"]', `${details.firstName} ${details.lastName}`, { delay: 50 });

            // Look for email input
            const emailInput = await this.page.$('input[name="email"]');
            if (emailInput) {
                await this.page.type('input[name="email"]', details.email, { delay: 50 });
            }

            // Click next
            const nextButton = await this.page.$('div[role="button"][data-testid="ocfSignupNextLink"]');
            if (nextButton) {
                await nextButton.click();
            }

            return {
                success: true,
                requiresVerification: true,
                additionalData: {}
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Instagram signup steps
     */
    async instagramSignupSteps(details) {
        try {
            await this.page.waitForSelector('input[name="emailOrPhone"]', { timeout: 10000 });
            await this.page.type('input[name="emailOrPhone"]', details.email, { delay: 50 });
            await this.page.type('input[name="fullName"]', `${details.firstName} ${details.lastName}`, { delay: 50 });
            await this.page.type('input[name="username"]', details.username, { delay: 50 });
            await this.page.type('input[name="password"]', details.password, { delay: 50 });

            // Click sign up button
            await this.page.click('button[type="submit"]');
            await this.sleep(3000);

            return {
                success: true,
                requiresVerification: true,
                additionalData: {}
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * LinkedIn signup steps
     */
    async linkedinSignupSteps(details) {
        try {
            await this.page.waitForSelector('input[id="email-address"]', { timeout: 10000 });
            await this.page.type('input[id="email-address"]', details.email, { delay: 50 });
            await this.page.type('input[id="password"]', details.password, { delay: 50 });

            await this.page.click('button[type="submit"]');
            await this.sleep(2000);

            // Name page
            await this.page.waitForSelector('input[id="first-name"]', { timeout: 10000 });
            await this.page.type('input[id="first-name"]', details.firstName, { delay: 50 });
            await this.page.type('input[id="last-name"]', details.lastName, { delay: 50 });
            await this.page.click('button[type="submit"]');

            return {
                success: true,
                requiresVerification: true,
                additionalData: {}
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
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
            case 'create':
                return this.createAccount(task.data.platform, task.data.options);
            case 'generate_details':
                return this.generateAccountDetails(task.data);
            case 'close':
                await this.closeBrowser();
                return { success: true };
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default AccountCreator;
