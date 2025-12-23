/**
 * Temp Email Provider - Generates disposable email addresses
 * Uses multiple temp mail services for account creation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TempEmailProvider {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/email');
        this.ensureDataDir();

        // Active email accounts
        this.activeEmails = new Map();

        // Temp mail API endpoints
        this.providers = {
            // 1secmail - Free, no API key needed
            oneSec: {
                name: '1secmail',
                domains: ['1secmail.com', '1secmail.org', '1secmail.net'],
                generateUrl: 'https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1',
                checkUrl: (login, domain) =>
                    `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`,
                messageUrl: (login, domain, id) =>
                    `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`
            },
            // Guerrilla Mail - Free
            guerrilla: {
                name: 'guerrillamail',
                baseUrl: 'https://api.guerrillamail.com/ajax.php',
                getEmail: 'https://api.guerrillamail.com/ajax.php?f=get_email_address',
                checkEmail: (sid) => `https://api.guerrillamail.com/ajax.php?f=check_email&sid_token=${sid}`
            }
        };
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Generate a new temp email using 1secmail
     */
    async generateEmail() {
        try {
            const response = await fetch(this.providers.oneSec.generateUrl);
            const emails = await response.json();

            if (emails && emails.length > 0) {
                const fullEmail = emails[0];
                const [login, domain] = fullEmail.split('@');

                const emailData = {
                    email: fullEmail,
                    login,
                    domain,
                    provider: '1secmail',
                    createdAt: new Date().toISOString(),
                    messages: []
                };

                this.activeEmails.set(fullEmail, emailData);
                this.saveEmails();

                console.log(`[TempEmail] Generated: ${fullEmail}`);
                return { success: true, email: fullEmail, data: emailData };
            }

            throw new Error('No email generated');

        } catch (error) {
            // Fallback: generate a random email locally
            const random = Math.random().toString(36).substring(2, 10);
            const domain = this.providers.oneSec.domains[0];
            const email = `king${random}@${domain}`;

            const emailData = {
                email,
                login: `king${random}`,
                domain,
                provider: '1secmail',
                createdAt: new Date().toISOString(),
                messages: [],
                generatedLocally: true
            };

            this.activeEmails.set(email, emailData);
            this.saveEmails();

            return { success: true, email, data: emailData, note: 'Generated locally' };
        }
    }

    /**
     * Check for new messages
     */
    async checkMessages(email) {
        const emailData = this.activeEmails.get(email);
        if (!emailData) {
            return { success: false, error: 'Email not found in active list' };
        }

        try {
            const { login, domain } = emailData;
            const checkUrl = this.providers.oneSec.checkUrl(login, domain);

            const response = await fetch(checkUrl);
            const messages = await response.json();

            // Update stored messages
            emailData.messages = messages;
            emailData.lastChecked = new Date().toISOString();
            this.saveEmails();

            return {
                success: true,
                email,
                messageCount: messages.length,
                messages: messages.map(m => ({
                    id: m.id,
                    from: m.from,
                    subject: m.subject,
                    date: m.date
                }))
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Read a specific message
     */
    async readMessage(email, messageId) {
        const emailData = this.activeEmails.get(email);
        if (!emailData) {
            return { success: false, error: 'Email not found' };
        }

        try {
            const { login, domain } = emailData;
            const messageUrl = this.providers.oneSec.messageUrl(login, domain, messageId);

            const response = await fetch(messageUrl);
            const message = await response.json();

            return {
                success: true,
                message: {
                    id: message.id,
                    from: message.from,
                    subject: message.subject,
                    date: message.date,
                    body: message.body,
                    textBody: message.textBody,
                    htmlBody: message.htmlBody,
                    attachments: message.attachments
                }
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Wait for a verification email
     */
    async waitForVerification(email, options = {}) {
        const maxAttempts = options.maxAttempts || 30;
        const interval = options.interval || 5000;
        const keywords = options.keywords || ['verify', 'confirm', 'activate', 'code', 'otp'];

        console.log(`[TempEmail] Waiting for verification email at ${email}...`);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const result = await this.checkMessages(email);

            if (result.success && result.messages.length > 0) {
                // Check each message for verification content
                for (const msg of result.messages) {
                    const subjectLower = (msg.subject || '').toLowerCase();
                    const isVerification = keywords.some(kw => subjectLower.includes(kw));

                    if (isVerification) {
                        const fullMessage = await this.readMessage(email, msg.id);

                        // Try to extract verification code
                        const codeMatch = (fullMessage.message?.body || '').match(/\b\d{4,8}\b/);
                        const linkMatch = (fullMessage.message?.body || '').match(/https?:\/\/[^\s]+/);

                        return {
                            success: true,
                            found: true,
                            message: fullMessage.message,
                            verificationCode: codeMatch ? codeMatch[0] : null,
                            verificationLink: linkMatch ? linkMatch[0] : null
                        };
                    }
                }
            }

            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, interval));
            console.log(`[TempEmail] Attempt ${attempt + 1}/${maxAttempts} - no verification yet`);
        }

        return {
            success: false,
            found: false,
            error: 'Verification email not received within timeout'
        };
    }

    /**
     * Get all active emails
     */
    getActiveEmails() {
        return Array.from(this.activeEmails.values());
    }

    /**
     * Save emails to disk
     */
    saveEmails() {
        const emailsFile = path.join(this.dataDir, 'temp-emails.json');
        const data = Object.fromEntries(this.activeEmails);
        fs.writeFileSync(emailsFile, JSON.stringify(data, null, 2));
    }

    /**
     * Load emails from disk
     */
    loadEmails() {
        const emailsFile = path.join(this.dataDir, 'temp-emails.json');
        if (fs.existsSync(emailsFile)) {
            const data = JSON.parse(fs.readFileSync(emailsFile, 'utf-8'));
            this.activeEmails = new Map(Object.entries(data));
        }
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'generate':
                return this.generateEmail();
            case 'check':
                return this.checkMessages(task.data.email);
            case 'read':
                return this.readMessage(task.data.email, task.data.messageId);
            case 'wait_verification':
                return this.waitForVerification(task.data.email, task.data.options);
            case 'list':
                return this.getActiveEmails();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default TempEmailProvider;
