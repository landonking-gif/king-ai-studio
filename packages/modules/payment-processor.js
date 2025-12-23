/**
 * Payment Processor - Handles payments and invoicing
 * Supports Stripe integration (requires API keys)
 * All payment actions require human approval
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PaymentProcessor {
    constructor(config = {}) {
        this.stripeKey = config.stripeKey || process.env.STRIPE_SECRET_KEY;
        this.paypalClientId = config.paypalClientId || process.env.PAYPAL_CLIENT_ID;
        this.paypalSecret = config.paypalSecret || process.env.PAYPAL_SECRET;

        this.dataDir = config.dataDir || path.join(__dirname, '../../data/payments');
        this.invoicesDir = path.join(this.dataDir, 'invoices');
        this.ensureDirectories();

        // Track pending payments (require approval)
        this.pendingPayments = [];
        this.stripe = null;
    }

    ensureDirectories() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.invoicesDir)) {
            fs.mkdirSync(this.invoicesDir, { recursive: true });
        }
    }

    /**
     * Initialize Stripe (lazy load)
     */
    async initStripe() {
        if (!this.stripeKey) {
            throw new Error('Stripe API key not configured. Set STRIPE_SECRET_KEY.');
        }

        if (!this.stripe) {
            try {
                const Stripe = (await import('stripe')).default;
                this.stripe = new Stripe(this.stripeKey);
            } catch (error) {
                throw new Error('Stripe not installed. Run: npm install stripe');
            }
        }
    }

    /**
     * Create an invoice (local record)
     */
    createInvoice(data) {
        const invoice = {
            id: `INV-${Date.now()}`,
            status: 'draft',
            createdAt: new Date().toISOString(),
            client: {
                name: data.clientName,
                email: data.clientEmail,
                address: data.clientAddress || ''
            },
            items: data.items || [],
            subtotal: 0,
            tax: data.tax || 0,
            taxRate: data.taxRate || 0,
            total: 0,
            currency: data.currency || 'USD',
            dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: data.notes || '',
            paymentLink: null
        };

        // Calculate totals
        invoice.subtotal = invoice.items.reduce((sum, item) => {
            return sum + (item.quantity * item.unitPrice);
        }, 0);
        invoice.tax = invoice.subtotal * (invoice.taxRate / 100);
        invoice.total = invoice.subtotal + invoice.tax;

        // Save invoice
        const invoicePath = path.join(this.invoicesDir, `${invoice.id}.json`);
        fs.writeFileSync(invoicePath, JSON.stringify(invoice, null, 2));

        console.log(`[PaymentProcessor] Invoice created: ${invoice.id} for $${invoice.total}`);

        return { success: true, invoice };
    }

    /**
     * Generate invoice HTML
     */
    generateInvoiceHtml(invoiceId) {
        const invoicePath = path.join(this.invoicesDir, `${invoiceId}.json`);
        if (!fs.existsSync(invoicePath)) {
            return { success: false, error: 'Invoice not found' };
        }

        const invoice = JSON.parse(fs.readFileSync(invoicePath, 'utf-8'));

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice ${invoice.id}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .invoice-title { font-size: 24px; color: #333; }
        .client-info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f5f5f5; }
        .totals { text-align: right; }
        .total-row { font-weight: bold; font-size: 18px; }
        .notes { margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="invoice-title">INVOICE</div>
        <div>
            <div><strong>${invoice.id}</strong></div>
            <div>Date: ${new Date(invoice.createdAt).toLocaleDateString()}</div>
            <div>Due: ${new Date(invoice.dueDate).toLocaleDateString()}</div>
        </div>
    </div>
    
    <div class="client-info">
        <strong>Bill To:</strong><br>
        ${invoice.client.name}<br>
        ${invoice.client.email}<br>
        ${invoice.client.address}
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.unitPrice.toFixed(2)}</td>
                    <td>$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <div>Subtotal: $${invoice.subtotal.toFixed(2)}</div>
        <div>Tax (${invoice.taxRate}%): $${invoice.tax.toFixed(2)}</div>
        <div class="total-row">Total: $${invoice.total.toFixed(2)} ${invoice.currency}</div>
    </div>

    ${invoice.notes ? `<div class="notes"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
    
    ${invoice.paymentLink ? `<p><a href="${invoice.paymentLink}">Pay Online</a></p>` : ''}
</body>
</html>`;

        const htmlPath = path.join(this.invoicesDir, `${invoiceId}.html`);
        fs.writeFileSync(htmlPath, html);

        return { success: true, htmlPath, html };
    }

    /**
     * Create Stripe payment link for invoice (REQUIRES APPROVAL)
     */
    async createStripePaymentLink(invoiceId) {
        const invoicePath = path.join(this.invoicesDir, `${invoiceId}.json`);
        if (!fs.existsSync(invoicePath)) {
            return { success: false, error: 'Invoice not found' };
        }

        const invoice = JSON.parse(fs.readFileSync(invoicePath, 'utf-8'));

        // Queue for approval instead of executing directly
        const paymentRequest = {
            id: `payment-${Date.now()}`,
            type: 'create_payment_link',
            invoiceId,
            amount: invoice.total,
            currency: invoice.currency,
            status: 'pending_approval',
            createdAt: new Date().toISOString()
        };

        this.pendingPayments.push(paymentRequest);
        this.savePendingPayments();

        console.log(`[PaymentProcessor] Payment request queued for approval: ${paymentRequest.id}`);

        return {
            success: true,
            requiresApproval: true,
            paymentRequestId: paymentRequest.id,
            message: 'Payment link creation requires human approval'
        };
    }

    /**
     * Execute approved payment (Stripe payment link)
     */
    async executeApprovedPaymentLink(paymentRequestId) {
        const request = this.pendingPayments.find(p => p.id === paymentRequestId);
        if (!request) {
            return { success: false, error: 'Payment request not found' };
        }

        if (request.status !== 'approved') {
            return { success: false, error: 'Payment request not approved' };
        }

        await this.initStripe();

        try {
            const invoicePath = path.join(this.invoicesDir, `${request.invoiceId}.json`);
            const invoice = JSON.parse(fs.readFileSync(invoicePath, 'utf-8'));

            // Create Stripe price
            const price = await this.stripe.prices.create({
                unit_amount: Math.round(invoice.total * 100), // Stripe uses cents
                currency: invoice.currency.toLowerCase(),
                product_data: {
                    name: `Invoice ${invoice.id}`
                }
            });

            // Create payment link
            const paymentLink = await this.stripe.paymentLinks.create({
                line_items: [{ price: price.id, quantity: 1 }],
                metadata: { invoiceId: invoice.id }
            });

            // Update invoice
            invoice.paymentLink = paymentLink.url;
            invoice.status = 'sent';
            fs.writeFileSync(invoicePath, JSON.stringify(invoice, null, 2));

            // Update payment request
            request.status = 'completed';
            request.paymentLink = paymentLink.url;
            this.savePendingPayments();

            return { success: true, paymentLink: paymentLink.url };

        } catch (error) {
            request.status = 'failed';
            request.error = error.message;
            this.savePendingPayments();
            return { success: false, error: error.message };
        }
    }

    /**
     * Create Stripe checkout session (REQUIRES APPROVAL)
     */
    async createCheckoutSession(config) {
        const request = {
            id: `checkout-${Date.now()}`,
            type: 'checkout_session',
            amount: config.amount,
            currency: config.currency || 'USD',
            description: config.description,
            customerEmail: config.customerEmail,
            status: 'pending_approval',
            createdAt: new Date().toISOString()
        };

        this.pendingPayments.push(request);
        this.savePendingPayments();

        return {
            success: true,
            requiresApproval: true,
            requestId: request.id,
            message: 'Checkout session requires human approval'
        };
    }

    /**
     * Approve a payment request
     */
    approvePayment(paymentRequestId, notes = '') {
        const request = this.pendingPayments.find(p => p.id === paymentRequestId);
        if (!request) {
            return { success: false, error: 'Payment request not found' };
        }

        request.status = 'approved';
        request.approvedAt = new Date().toISOString();
        request.approvalNotes = notes;
        this.savePendingPayments();

        console.log(`[PaymentProcessor] Payment approved: ${paymentRequestId}`);

        return { success: true, request };
    }

    /**
     * Reject a payment request
     */
    rejectPayment(paymentRequestId, reason) {
        const request = this.pendingPayments.find(p => p.id === paymentRequestId);
        if (!request) {
            return { success: false, error: 'Payment request not found' };
        }

        request.status = 'rejected';
        request.rejectedAt = new Date().toISOString();
        request.rejectionReason = reason;
        this.savePendingPayments();

        return { success: true, request };
    }

    /**
     * Get pending payment requests
     */
    getPendingPayments() {
        return this.pendingPayments.filter(p => p.status === 'pending_approval');
    }

    /**
     * Save pending payments to file
     */
    savePendingPayments() {
        const filePath = path.join(this.dataDir, 'pending-payments.json');
        fs.writeFileSync(filePath, JSON.stringify(this.pendingPayments, null, 2));
    }

    /**
     * Load pending payments from file
     */
    loadPendingPayments() {
        const filePath = path.join(this.dataDir, 'pending-payments.json');
        if (fs.existsSync(filePath)) {
            this.pendingPayments = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    }

    /**
     * Get all invoices
     */
    getInvoices(status = null) {
        const files = fs.readdirSync(this.invoicesDir)
            .filter(f => f.endsWith('.json'));

        const invoices = files.map(f => {
            return JSON.parse(fs.readFileSync(path.join(this.invoicesDir, f), 'utf-8'));
        });

        if (status) {
            return invoices.filter(i => i.status === status);
        }
        return invoices;
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'create_invoice':
                return this.createInvoice(task.data);
            case 'generate_html':
                return this.generateInvoiceHtml(task.data.invoiceId);
            case 'create_payment_link':
                return this.createStripePaymentLink(task.data.invoiceId);
            case 'create_checkout':
                return this.createCheckoutSession(task.data);
            case 'approve':
                return this.approvePayment(task.data.id, task.data.notes);
            case 'reject':
                return this.rejectPayment(task.data.id, task.data.reason);
            case 'execute_approved':
                return this.executeApprovedPaymentLink(task.data.id);
            case 'pending':
                return this.getPendingPayments();
            case 'invoices':
                return this.getInvoices(task.data?.status);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default PaymentProcessor;
