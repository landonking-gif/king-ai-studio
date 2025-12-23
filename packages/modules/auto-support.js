/**
 * Auto Support - AI chatbot for customer support across all businesses
 * Handles common queries, escalates when needed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutoSupport {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/support');
        this.ensureDataDir();
        this.modelRouter = config.modelRouter || new ModelRouter();
        this.loadKnowledgeBase();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadKnowledgeBase() {
        const kbFile = path.join(this.dataDir, 'knowledge-base.json');
        if (fs.existsSync(kbFile)) {
            this.knowledgeBase = JSON.parse(fs.readFileSync(kbFile, 'utf-8'));
        } else {
            this.knowledgeBase = {
                faqs: {},
                policies: {},
                escalationRules: []
            };
        }
    }

    saveKnowledgeBase() {
        const kbFile = path.join(this.dataDir, 'knowledge-base.json');
        fs.writeFileSync(kbFile, JSON.stringify(this.knowledgeBase, null, 2));
    }

    /**
     * Add FAQ for a business
     */
    addFaq(businessId, question, answer) {
        if (!this.knowledgeBase.faqs[businessId]) {
            this.knowledgeBase.faqs[businessId] = [];
        }
        this.knowledgeBase.faqs[businessId].push({ question, answer });
        this.saveKnowledgeBase();
    }

    /**
     * Add policy for a business
     */
    addPolicy(businessId, policyType, content) {
        if (!this.knowledgeBase.policies[businessId]) {
            this.knowledgeBase.policies[businessId] = {};
        }
        this.knowledgeBase.policies[businessId][policyType] = content;
        this.saveKnowledgeBase();
    }

    /**
     * Handle a customer message
     */
    async handleMessage(businessId, message, conversationHistory = []) {
        const business = this.knowledgeBase.faqs[businessId] ? { id: businessId } : null;
        const faqs = this.knowledgeBase.faqs[businessId] || [];
        const policies = this.knowledgeBase.policies[businessId] || {};

        // Check if needs escalation
        const escalationKeywords = ['refund', 'legal', 'lawyer', 'sue', 'angry', 'furious', 'cancel', 'fraud'];
        const needsEscalation = escalationKeywords.some(kw => message.toLowerCase().includes(kw));

        if (needsEscalation) {
            return {
                response: "I understand your concern. Let me connect you with a human team member who can assist you better. You'll receive a response within 24 hours.",
                escalated: true,
                reason: 'Escalation keyword detected',
                ticketId: `ticket-${Date.now()}`
            };
        }

        // Build context
        const context = {
            faqs: faqs.slice(0, 10),
            policies,
            history: conversationHistory.slice(-5)
        };

        // Generate response
        const prompt = `You are a friendly, helpful customer support agent. Answer the customer's question based on the available information.

BUSINESS FAQS:
${faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

POLICIES:
${Object.entries(policies).map(([k, v]) => `${k}: ${v}`).join('\n')}

CONVERSATION HISTORY:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

CUSTOMER MESSAGE: ${message}

Respond helpfully and concisely. If you don't know the answer, suggest the customer contact support at support@[business].com.`;

        const result = await this.modelRouter.complete(prompt, 'fast');

        // Log conversation
        this.logConversation(businessId, message, result.content);

        return {
            response: result.content,
            escalated: false,
            model: result.modelId
        };
    }

    /**
     * Log conversation for training/analysis
     */
    logConversation(businessId, customerMessage, botResponse) {
        const logFile = path.join(this.dataDir, `conversations-${businessId}.jsonl`);
        const logEntry = {
            timestamp: new Date().toISOString(),
            customer: customerMessage,
            response: botResponse
        };
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }

    /**
     * Generate FAQs from conversation history
     */
    async generateFaqs(businessId) {
        const logFile = path.join(this.dataDir, `conversations-${businessId}.jsonl`);
        if (!fs.existsSync(logFile)) {
            return { success: false, error: 'No conversation history' };
        }

        const conversations = fs.readFileSync(logFile, 'utf-8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));

        const prompt = `Analyze these customer support conversations and extract the top 10 most common questions with ideal answers.

CONVERSATIONS:
${conversations.slice(-100).map(c => `Customer: ${c.customer}\nResponse: ${c.response}`).join('\n\n')}

Return as JSON:
[{"question": "", "answer": ""}]`;

        const result = await this.modelRouter.complete(prompt, 'reasoning');

        try {
            const jsonMatch = result.content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const faqs = JSON.parse(jsonMatch[0]);
                this.knowledgeBase.faqs[businessId] = faqs;
                this.saveKnowledgeBase();
                return { success: true, faqs };
            }
        } catch (e) { }

        return { success: false, error: 'Failed to parse FAQs' };
    }

    /**
     * Get support analytics
     */
    getAnalytics(businessId) {
        const logFile = path.join(this.dataDir, `conversations-${businessId}.jsonl`);
        if (!fs.existsSync(logFile)) {
            return { totalConversations: 0 };
        }

        const conversations = fs.readFileSync(logFile, 'utf-8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));

        return {
            totalConversations: conversations.length,
            last24Hours: conversations.filter(c =>
                new Date(c.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length,
            escalationRate: 0, // Would calculate from actual escalations
            avgResponseLength: conversations.reduce((sum, c) => sum + c.response.length, 0) / conversations.length
        };
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'message':
                return this.handleMessage(task.data.businessId, task.data.message, task.data.history);
            case 'add_faq':
                return this.addFaq(task.data.businessId, task.data.question, task.data.answer);
            case 'add_policy':
                return this.addPolicy(task.data.businessId, task.data.type, task.data.content);
            case 'generate_faqs':
                return this.generateFaqs(task.data.businessId);
            case 'analytics':
                return this.getAnalytics(task.data.businessId);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default AutoSupport;
