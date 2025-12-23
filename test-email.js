import 'dotenv/config';
import { EmailNotifier } from './packages/core/email-notifier.js';

async function test() {
    console.log('Testing Email Notifier...');
    const notifier = new EmailNotifier({
        gmailUser: process.env.GMAIL_USER,
        gmailPassword: process.env.GMAIL_APP_PASSWORD,
        recipientEmail: process.env.NOTIFICATION_EMAIL || 'landon.king@luxebuildmedia.com'
    });

    const connected = await notifier.init();
    if (connected) {
        console.log('✅ Connected! Sending test email...');
        const result = await notifier.sendNotification('Test Notification', 'This is a test from King AI Studio simulation.');
        console.log('Result:', result);
    } else {
        console.log('❌ Failed to connect. Check credentials.');
    }
}

test().catch(console.error);
