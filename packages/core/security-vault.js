/**
 * Security Vault - Implements ROI Improvement #21
 * Handles zero-knowledge encryption for sensitive client and business data.
 */

import crypto from 'crypto';

export class SecurityVault {
    constructor(config = {}) {
        this.algorithm = 'aes-256-cbc';
        this.masterKey = config.masterKey || process.env.VAULT_MASTER_KEY || crypto.randomBytes(32);
    }

    /**
     * Encrypt a piece of sensitive data
     */
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.masterKey), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    /**
     * Decrypt a piece of sensitive data
     */
    decrypt(text) {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.masterKey), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
}

export default SecurityVault;
