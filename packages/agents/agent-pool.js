/**
 * Agent Pool - Parallel agent workers with specialization and communication
 * Manages an army of specialized AI agents working in parallel
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Base Agent class
 */
class Agent extends EventEmitter {
    constructor(config = {}) {
        super();
        this.id = config.id || `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.name = config.name || 'UnnamedAgent';
        this.type = config.type || 'general';
        this.status = 'idle'; // idle, working, waiting, error
        this.currentTask = null;
        this.completedTasks = 0;
        this.modelRouter = config.modelRouter;
        this.messageQueue = [];
    }

    /**
     * Process a task
     */
    async processTask(task) {
        this.status = 'working';
        this.currentTask = task;
        this.emit('task_start', { agentId: this.id, task });

        try {
            const result = await this.execute(task);
            this.completedTasks++;
            this.status = 'idle';
            this.currentTask = null;
            this.emit('task_complete', { agentId: this.id, task, result });
            return result;
        } catch (error) {
            this.status = 'error';
            this.emit('task_error', { agentId: this.id, task, error: error.message });
            throw error;
        }
    }

    /**
     * Execute task - to be overridden by specialist agents
     */
    async execute(task) {
        throw new Error('Agent.execute() must be implemented by subclass');
    }

    /**
     * Send message to another agent
     */
    sendMessage(targetAgentId, message) {
        this.emit('message', {
            from: this.id,
            to: targetAgentId,
            content: message,
            timestamp: Date.now()
        });
    }

    /**
     * Receive message from another agent
     */
    receiveMessage(message) {
        this.messageQueue.push(message);
        this.emit('message_received', message);
    }

    /**
     * Get agent status
     */
    getStatus() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            status: this.status,
            completedTasks: this.completedTasks,
            currentTask: this.currentTask?.description || null,
            pendingMessages: this.messageQueue.length
        };
    }
}

/**
 * Research Agent - Gathers information and analyzes data
 */
class ResearchAgent extends Agent {
    constructor(config = {}) {
        super({ ...config, name: config.name || 'ResearchAgent', type: 'research' });
        this.modelPreference = 'reasoning';
    }

    async execute(task) {
        const prompt = `You are a research agent. ${task.description}

Provide a comprehensive research report including:
1. Key findings
2. Data sources (if applicable)
3. Analysis
4. Recommendations

Task details: ${JSON.stringify(task.data || {})}`;

        const result = await this.modelRouter.complete(prompt, this.modelPreference);
        return {
            type: 'research',
            findings: result.content,
            reasoning: result.reasoning
        };
    }
}

/**
 * Social Media Agent - Handles social media tasks
 */
class SocialAgent extends Agent {
    constructor(config = {}) {
        super({ ...config, name: config.name || 'SocialAgent', type: 'social' });
        this.modelPreference = 'creative';
    }

    async execute(task) {
        const prompt = `You are a social media expert. ${task.description}

Create engaging content that:
1. Captures attention
2. Drives engagement
3. Aligns with brand voice
4. Uses appropriate hashtags and formatting

Platform: ${task.platform || 'general'}
Task details: ${JSON.stringify(task.data || {})}

Return content ready to post.`;

        const result = await this.modelRouter.complete(prompt, this.modelPreference);
        return {
            type: 'social',
            content: result.content,
            platform: task.platform
        };
    }
}

/**
 * Code Agent - Writes and reviews code
 */
class CodeAgent extends Agent {
    constructor(config = {}) {
        super({ ...config, name: config.name || 'CodeAgent', type: 'coding' });
        this.modelPreference = 'coding';
    }

    async execute(task) {
        const prompt = `You are an expert programmer. ${task.description}

Requirements:
- Write clean, maintainable code
- Include comments
- Handle errors appropriately
- Follow best practices

Task details: ${JSON.stringify(task.data || {})}

Return the code with explanations.`;

        const result = await this.modelRouter.complete(prompt, this.modelPreference);
        return {
            type: 'code',
            code: result.content,
            language: task.language || 'javascript'
        };
    }
}

/**
 * Outreach Agent - Handles client communication
 */
class OutreachAgent extends Agent {
    constructor(config = {}) {
        super({ ...config, name: config.name || 'OutreachAgent', type: 'outreach' });
        this.modelPreference = 'creative';
    }

    async execute(task) {
        const prompt = `You are a professional business communicator. ${task.description}

Write a message that:
1. Is professional and personable
2. Clearly communicates the purpose
3. Has a clear call to action
4. Is appropriate for the context

Context: ${task.context || 'business communication'}
Task details: ${JSON.stringify(task.data || {})}`;

        const result = await this.modelRouter.complete(prompt, this.modelPreference);
        return {
            type: 'outreach',
            message: result.content
        };
    }
}

/**
 * Coordinator Agent - Manages and coordinates other agents
 */
class CoordinatorAgent extends Agent {
    constructor(config = {}) {
        super({ ...config, name: config.name || 'CoordinatorAgent', type: 'coordinator' });
        this.modelPreference = 'reasoning';
    }

    async execute(task) {
        const prompt = `You are a project coordinator AI. Analyze this task and break it down for a team of specialist agents.

Available agent types:
- research: For gathering information and analysis
- social: For social media content creation
- coding: For writing code
- outreach: For client communication

Task: ${task.description}
Details: ${JSON.stringify(task.data || {})}

Return a JSON array of subtasks, each with:
{
  "agentType": "research|social|coding|outreach",
  "description": "What this agent should do",
  "priority": 1-5 (1=highest),
  "dependencies": [] (IDs of tasks that must complete first)
}

Return ONLY valid JSON array.`;

        const result = await this.modelRouter.complete(prompt, this.modelPreference);

        try {
            const subtasks = JSON.parse(result.content);
            return {
                type: 'coordination',
                subtasks
            };
        } catch (e) {
            return {
                type: 'coordination',
                subtasks: [{
                    agentType: 'research',
                    description: task.description,
                    priority: 1
                }],
                note: 'Could not parse subtasks, defaulting to research'
            };
        }
    }
}

/**
 * Agent Pool - Manages multiple agents
 */
export class AgentPool extends EventEmitter {
    constructor(config = {}) {
        super();
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/agents');
        this.ensureDataDir();

        this.modelRouter = config.modelRouter || new ModelRouter();

        // Agent registry
        this.agents = new Map();

        // Task queue
        this.taskQueue = [];
        this.isProcessing = false;

        // Initialize default agents
        this.initializeAgents(config.agentConfig);

        // Message bus for inter-agent communication
        this.setupMessageBus();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Initialize default agent pool
     */
    initializeAgents(config = {}) {
        const agentConfig = { modelRouter: this.modelRouter };

        // Create coordinator
        this.addAgent(new CoordinatorAgent(agentConfig));

        // Create worker agents
        const workerCounts = config.workers || {
            research: 2,
            social: 2,
            coding: 2,
            outreach: 1
        };

        for (let i = 0; i < workerCounts.research; i++) {
            this.addAgent(new ResearchAgent({ ...agentConfig, name: `Research-${i + 1}` }));
        }
        for (let i = 0; i < workerCounts.social; i++) {
            this.addAgent(new SocialAgent({ ...agentConfig, name: `Social-${i + 1}` }));
        }
        for (let i = 0; i < workerCounts.coding; i++) {
            this.addAgent(new CodeAgent({ ...agentConfig, name: `Code-${i + 1}` }));
        }
        for (let i = 0; i < workerCounts.outreach; i++) {
            this.addAgent(new OutreachAgent({ ...agentConfig, name: `Outreach-${i + 1}` }));
        }

        console.log(`[AgentPool] Initialized with ${this.agents.size} agents`);
    }

    /**
     * Add an agent to the pool
     */
    addAgent(agent) {
        this.agents.set(agent.id, agent);

        // Forward agent events
        agent.on('task_complete', (data) => this.emit('task_complete', data));
        agent.on('task_error', (data) => this.emit('task_error', data));
        agent.on('message', (data) => this.routeMessage(data));
    }

    /**
     * Setup message bus for agent communication
     */
    setupMessageBus() {
        this.on('agent_message', (message) => {
            const targetAgent = this.agents.get(message.to);
            if (targetAgent) {
                targetAgent.receiveMessage(message);
            }
        });
    }

    /**
     * Route message between agents
     */
    routeMessage(message) {
        if (message.to === 'broadcast') {
            // Broadcast to all agents
            for (const agent of this.agents.values()) {
                if (agent.id !== message.from) {
                    agent.receiveMessage(message);
                }
            }
        } else {
            const targetAgent = this.agents.get(message.to);
            if (targetAgent) {
                targetAgent.receiveMessage(message);
            }
        }

        // Log message
        this.logMessage(message);
    }

    /**
     * Log inter-agent message
     */
    logMessage(message) {
        const logFile = path.join(this.dataDir, 'agent-messages.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(message) + '\n');
    }

    /**
     * Get an available agent of a specific type
     */
    getAvailableAgent(type) {
        for (const agent of this.agents.values()) {
            if (agent.type === type && agent.status === 'idle') {
                return agent;
            }
        }
        return null;
    }

    /**
     * Submit a task to the pool
     */
    async submitTask(task) {
        // Get coordinator to break down complex tasks
        if (task.complex) {
            const coordinator = this.getAvailableAgent('coordinator');
            if (coordinator) {
                const plan = await coordinator.processTask(task);

                // Queue subtasks
                for (const subtask of plan.subtasks || []) {
                    this.taskQueue.push({
                        ...subtask,
                        parentId: task.id,
                        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                    });
                }
            }
        } else {
            this.taskQueue.push({
                ...task,
                id: task.id || `task-${Date.now()}`
            });
        }

        // Start processing if not already
        if (!this.isProcessing) {
            this.processQueue();
        }

        return { success: true, tasksQueued: this.taskQueue.length };
    }

    /**
     * Process task queue in parallel
     */
    async processQueue() {
        this.isProcessing = true;

        while (this.taskQueue.length > 0) {
            // Get tasks that can run in parallel (no dependencies or deps satisfied)
            const readyTasks = this.taskQueue.filter(t =>
                !t.dependencies || t.dependencies.length === 0
            );

            if (readyTasks.length === 0) {
                // All remaining tasks have unmet dependencies
                await this.sleep(1000);
                continue;
            }

            // Process ready tasks in parallel
            const promises = [];

            for (const task of readyTasks) {
                const agent = this.getAvailableAgent(task.agentType || 'research');

                if (agent) {
                    // Remove from queue
                    this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);

                    // Process
                    promises.push(
                        agent.processTask(task)
                            .then(result => ({ task, result, success: true }))
                            .catch(error => ({ task, error: error.message, success: false }))
                    );
                }
            }

            if (promises.length > 0) {
                const results = await Promise.all(promises);

                // Remove satisfied dependencies
                const completedIds = results.filter(r => r.success).map(r => r.task.id);
                for (const task of this.taskQueue) {
                    if (task.dependencies) {
                        task.dependencies = task.dependencies.filter(d => !completedIds.includes(d));
                    }
                }

                this.emit('batch_complete', results);
            } else {
                // No agents available, wait
                await this.sleep(500);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Get pool status
     */
    getStatus() {
        const agents = [];
        for (const agent of this.agents.values()) {
            agents.push(agent.getStatus());
        }

        return {
            totalAgents: this.agents.size,
            activeAgents: agents.filter(a => a.status === 'working').length,
            idleAgents: agents.filter(a => a.status === 'idle').length,
            queuedTasks: this.taskQueue.length,
            agents
        };
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
            case 'submit':
                return this.submitTask(task.data);
            case 'status':
                return this.getStatus();
            case 'add_agent':
                const AgentClass = {
                    research: ResearchAgent,
                    social: SocialAgent,
                    coding: CodeAgent,
                    outreach: OutreachAgent,
                    coordinator: CoordinatorAgent
                }[task.data.type];
                if (AgentClass) {
                    this.addAgent(new AgentClass({
                        modelRouter: this.modelRouter,
                        name: task.data.name
                    }));
                    return { success: true };
                }
                return { success: false, error: 'Unknown agent type' };
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

// Export individual agent classes for extension
export { Agent, ResearchAgent, SocialAgent, CodeAgent, OutreachAgent, CoordinatorAgent };
export default AgentPool;
