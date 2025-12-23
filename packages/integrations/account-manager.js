/**
 * Account Manager - Manages pools of accounts for external services
 * Tracks account health, rate limits, and enables automatic rotation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AccountManager {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/accounts');
        this.ensureDataDir();
        this.accounts = this.loadAccounts();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Load accounts from storage
     */
    loadAccounts() {
        const accountsFile = path.join(this.dataDir, 'accounts.json');
        if (fs.existsSync(accountsFile)) {
            try {
                return JSON.parse(fs.readFileSync(accountsFile, 'utf-8'));
            } catch (error) {
                console.error('Failed to load accounts:', error.message);
            }
        }
        return { platforms: {} };
    }

    /**
     * Save accounts to storage
     */
    saveAccounts() {
        const accountsFile = path.join(this.dataDir, 'accounts.json');
        fs.writeFileSync(accountsFile, JSON.stringify(this.accounts, null, 2));
    }

    /**
     * Add a new account to a platform pool
     * @param {string} platform - Platform name (instagram, twitter, email, etc.)
     * @param {object} credentials - Account credentials
     */
    addAccount(platform, credentials) {
        if (!this.accounts.platforms[platform]) {
            this.accounts.platforms[platform] = [];
        }

        const account = {
            id: `${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            platform,
            credentials: {
                username: credentials.username,
                // Store password securely - in production, use encryption
                password: credentials.password,
                email: credentials.email,
                ...credentials
            },
            health: {
                status: 'active', // active, rate_limited, banned, suspended, needs_verification
                lastUsed: null,
                rateLimitResetAt: null,
                failureCount: 0,
                successCount: 0
            },
            metadata: {
                createdAt: new Date().toISOString(),
                notes: credentials.notes || '',
                proxy: credentials.proxy || null
            }
        };

        this.accounts.platforms[platform].push(account);
        this.saveAccounts();

        return { success: true, account: { id: account.id, platform, username: credentials.username } };
    }

    /**
     * Get a healthy account for a platform
     * @param {string} platform - Platform name
     * @returns {object|null} Account credentials or null if none available
     */
    getHealthyAccount(platform) {
        const platformAccounts = this.accounts.platforms[platform];
        if (!platformAccounts || platformAccounts.length === 0) {
            return null;
        }

        // Check for rate limit resets
        this.checkRateLimitResets(platform);

        // Find an active account, preferring least recently used
        const activeAccounts = platformAccounts
            .filter(a => a.health.status === 'active')
            .sort((a, b) => {
                if (!a.health.lastUsed) return -1;
                if (!b.health.lastUsed) return 1;
                return new Date(a.health.lastUsed) - new Date(b.health.lastUsed);
            });

        if (activeAccounts.length === 0) {
            return null;
        }

        const account = activeAccounts[0];
        return {
            id: account.id,
            platform: account.platform,
            credentials: account.credentials,
            proxy: account.metadata.proxy
        };
    }

    /**
     * Mark an account as used (update lastUsed timestamp)
     * @param {string} accountId - Account ID
     */
    markUsed(accountId) {
        const account = this.findAccount(accountId);
        if (account) {
            account.health.lastUsed = new Date().toISOString();
            account.health.successCount++;
            this.saveAccounts();
        }
    }

    /**
     * Mark an account as rate limited
     * @param {string} accountId - Account ID
     * @param {number} resetMinutes - Minutes until rate limit resets
     */
    markRateLimited(accountId, resetMinutes = 60) {
        const account = this.findAccount(accountId);
        if (account) {
            account.health.status = 'rate_limited';
            account.health.rateLimitResetAt = new Date(Date.now() + resetMinutes * 60 * 1000).toISOString();
            account.health.failureCount++;
            this.saveAccounts();
            console.log(`[AccountManager] Account ${accountId} marked as rate limited until ${account.health.rateLimitResetAt}`);
        }
    }

    /**
     * Mark an account as banned
     * @param {string} accountId - Account ID
     * @param {string} reason - Ban reason
     */
    markBanned(accountId, reason = '') {
        const account = this.findAccount(accountId);
        if (account) {
            account.health.status = 'banned';
            account.metadata.banReason = reason;
            account.metadata.bannedAt = new Date().toISOString();
            this.saveAccounts();
            console.log(`[AccountManager] Account ${accountId} marked as banned: ${reason}`);
        }
    }

    /**
     * Mark an account as needing verification
     * @param {string} accountId - Account ID
     */
    markNeedsVerification(accountId) {
        const account = this.findAccount(accountId);
        if (account) {
            account.health.status = 'needs_verification';
            this.saveAccounts();
        }
    }

    /**
     * Restore an account to active status
     * @param {string} accountId - Account ID
     */
    restoreAccount(accountId) {
        const account = this.findAccount(accountId);
        if (account) {
            account.health.status = 'active';
            account.health.rateLimitResetAt = null;
            this.saveAccounts();
        }
    }

    /**
     * Rotate to next available account for a platform
     * @param {string} platform - Platform name
     * @param {string} currentAccountId - Current account to rotate away from
     */
    rotateAccount(platform, currentAccountId) {
        // Mark current as rate limited (short cooldown)
        if (currentAccountId) {
            this.markRateLimited(currentAccountId, 15);
        }

        // Get next healthy account
        return this.getHealthyAccount(platform);
    }

    /**
     * Check and reset rate-limited accounts whose reset time has passed
     * @param {string} platform - Platform name
     */
    checkRateLimitResets(platform) {
        const platformAccounts = this.accounts.platforms[platform];
        if (!platformAccounts) return;

        const now = new Date();
        let updated = false;

        for (const account of platformAccounts) {
            if (account.health.status === 'rate_limited' && account.health.rateLimitResetAt) {
                if (new Date(account.health.rateLimitResetAt) <= now) {
                    account.health.status = 'active';
                    account.health.rateLimitResetAt = null;
                    updated = true;
                    console.log(`[AccountManager] Account ${account.id} rate limit reset, now active`);
                }
            }
        }

        if (updated) {
            this.saveAccounts();
        }
    }

    /**
     * Find an account by ID across all platforms
     * @param {string} accountId - Account ID
     */
    findAccount(accountId) {
        for (const platform of Object.keys(this.accounts.platforms)) {
            const account = this.accounts.platforms[platform].find(a => a.id === accountId);
            if (account) return account;
        }
        return null;
    }

    /**
     * Get all accounts for a platform
     * @param {string} platform - Platform name
     */
    getAccounts(platform) {
        return (this.accounts.platforms[platform] || []).map(a => ({
            id: a.id,
            username: a.credentials.username,
            status: a.health.status,
            lastUsed: a.health.lastUsed,
            successCount: a.health.successCount,
            failureCount: a.health.failureCount
        }));
    }

    /**
     * Get account pool summary
     */
    getSummary() {
        const summary = {};
        for (const [platform, accounts] of Object.entries(this.accounts.platforms)) {
            summary[platform] = {
                total: accounts.length,
                active: accounts.filter(a => a.health.status === 'active').length,
                rateLimited: accounts.filter(a => a.health.status === 'rate_limited').length,
                banned: accounts.filter(a => a.health.status === 'banned').length,
                needsVerification: accounts.filter(a => a.health.status === 'needs_verification').length
            };
        }
        return summary;
    }

    /**
     * Remove an account
     * @param {string} accountId - Account ID to remove
     */
    removeAccount(accountId) {
        for (const platform of Object.keys(this.accounts.platforms)) {
            const index = this.accounts.platforms[platform].findIndex(a => a.id === accountId);
            if (index !== -1) {
                this.accounts.platforms[platform].splice(index, 1);
                this.saveAccounts();
                return { success: true };
            }
        }
        return { success: false, error: 'Account not found' };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'add':
                return this.addAccount(task.data.platform, task.data.credentials);
            case 'get':
                return this.getHealthyAccount(task.data.platform);
            case 'rotate':
                return this.rotateAccount(task.data.platform, task.data.currentId);
            case 'mark_used':
                this.markUsed(task.data.id);
                return { success: true };
            case 'mark_rate_limited':
                this.markRateLimited(task.data.id, task.data.resetMinutes);
                return { success: true };
            case 'mark_banned':
                this.markBanned(task.data.id, task.data.reason);
                return { success: true };
            case 'restore':
                this.restoreAccount(task.data.id);
                return { success: true };
            case 'list':
                return this.getAccounts(task.data.platform);
            case 'summary':
                return this.getSummary();
            case 'remove':
                return this.removeAccount(task.data.id);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default AccountManager;
