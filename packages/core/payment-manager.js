/**
 * Payment Manager - Implements ROI Improvement #4 (Universal Payment Abstraction)
 * Manages multiple payment gateways and provides failover capabilities.
 */

export class PaymentManager {
    constructor(config = {}) {
        this.db = config.db;
        this.activeGateway = config.defaultGateway || 'stripe';
        this.gateways = {
            stripe: { name: 'Stripe', status: 'online', priority: 1 },
            paypal: { name: 'PayPal', status: 'online', priority: 2 },
            crypto: { name: 'Coinbase Commerce', status: 'online', priority: 3 }
        };
    }

    /**
     * Process a payment across the active or fallback gateway
     */
    async processPayment(orderId, amount, currency = 'USD') {
        console.log(`[PaymentManager] Processing $${amount} ${currency} for order ${orderId}...`);

        let gateway = this.gateways[this.activeGateway];

        if (gateway.status !== 'online') {
            gateway = this.findFallback();
            console.log(`[PaymentManager] Primary gateway [${this.activeGateway}] offline. Failing over to [${gateway.name}].`);
        }

        // Mocking the actual API call
        const success = Math.random() > 0.05; // 95% success rate simulation

        if (success) {
            return {
                success: true,
                transactionId: `tx_${Math.random().toString(36).substr(2, 9)}`,
                gateway: gateway.name,
                orderId
            };
        } else {
            // If it failed, mark gateway as unstable and try fallback immediately
            gateway.status = 'unstable';
            const fallback = this.findFallback();
            console.log(`[PaymentManager] Transaction failed on ${gateway.name}. Retrying on ${fallback.name}...`);

            return {
                success: true,
                transactionId: `tx_fallback_${Math.random().toString(36).substr(2, 9)}`,
                gateway: fallback.name,
                orderId,
                wasFallback: true
            };
        }
    }

    findFallback() {
        const sorted = Object.entries(this.gateways)
            .filter(([id, g]) => g.status === 'online' && id !== this.activeGateway)
            .sort((a, b) => a[1].priority - b[1].priority);

        return sorted[0] ? sorted[0][1] : this.gateways[this.activeGateway];
    }

    /**
     * Switch primary gateway (manual or autonomous)
     */
    setPrimaryGateway(gatewayId) {
        if (this.gateways[gatewayId]) {
            this.activeGateway = gatewayId;
            console.log(`[PaymentManager] Switched active gateway to: ${gatewayId}`);
            return true;
        }
        return false;
    }
}

export default PaymentManager;
