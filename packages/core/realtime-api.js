/**
 * Real-time API
 * Handles live updates to the dashboard via Server-Sent Events (SSE)
 * Zero-dependency implementation for maximum compatibility
 */

export class RealtimeAPI {
    constructor() {
        this.clients = new Set();
        this.history = []; // Cache recent events for new connections
        this.maxHistory = 50;
    }

    /**
     * Handle incoming SSE connection request
     * @param {IncomingMessage} req 
     * @param {ServerResponse} res 
     */
    handleConnection(req, res) {
        // SSE Headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        const clientId = Date.now();
        const newClient = {
            id: clientId,
            res
        };

        this.clients.add(newClient);
        console.log(`[RealtimeAPI] Client connected: ${clientId} (Total: ${this.clients.size})`);

        // Send initial connection success event
        this.sendToClient(newClient, 'connected', {
            message: 'Real-time uplink established',
            connectedAt: new Date().toISOString()
        });

        // Send history if needed (optional)
        // this.history.forEach(event => this.sendToClient(newClient, event.type, event.data));

        // Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 15000);

        req.on('close', () => {
            console.log(`[RealtimeAPI] Client disconnected: ${clientId}`);
            this.clients.delete(newClient);
            clearInterval(heartbeat);
        });
    }

    /**
     * Broadcast an event to all connected clients
     * @param {string} type - Event type (e.g., 'log', 'task', 'stat')
     * @param {object} data - Data payload
     */
    broadcast(type, data) {
        const payload = {
            type,
            data,
            timestamp: new Date().toISOString()
        };

        // Add to history
        this.history.unshift(payload);
        if (this.history.length > this.maxHistory) this.history.pop();

        this.clients.forEach(client => {
            this.sendToClient(client, type, data);
        });
    }

    /**
     * Send event to a specific client
     */
    sendToClient(client, type, data) {
        try {
            const payload = JSON.stringify({ type, data });
            client.res.write(`data: ${payload}\n\n`);
        } catch (e) {
            console.error(`[RealtimeAPI] Error sending to client ${client.id}:`, e.message);
            this.clients.delete(client);
        }
    }

    /**
     * Get current stats
     */
    getStats() {
        return {
            clients: this.clients.size,
            uptime: process.uptime(),
            historySize: this.history.length
        };
    }
}
