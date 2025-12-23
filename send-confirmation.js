import 'dotenv/config';
import { EmailNotifier } from './packages/core/email-notifier.js';

async function sendFinalConfirmation() {
    const notifier = new EmailNotifier({
        gmailUser: process.env.GMAIL_USER,
        gmailPassword: process.env.GMAIL_APP_PASSWORD,
        recipientEmail: process.env.NOTIFICATION_EMAIL || 'landon.king@luxebuildmedia.com'
    });

    await notifier.init();
    await notifier.sendNotification(
        'Simulation Complete - Confirmation Needed',
        'The simulations on King AI Studio have been run. All parts (AI fallback, email notifications, and approval flows) have been verified. The system is now waiting for your approval to continue with actual tasks.'
    );
    console.log('Final confirmation email sent.');
}

sendFinalConfirmation().catch(console.error);
