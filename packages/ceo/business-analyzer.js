/**
 * Business Analyzer - Evaluates business ideas and creates actionable plans
 * Uses AI to research, analyze viability, and design business models
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';
import { AuditLogger } from '../core/audit-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BusinessAnalyzer {
  constructor(config = {}) {
    this.ai = config.aiProvider || config.modelRouter || new ModelRouter(config);
    this.auditLogger = config.auditLogger || new AuditLogger();
    this.dataDir = config.dataDir || path.join(__dirname, '../../data/businesses');
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Robust JSON parser that handles markdown blocks and extra text
   */
  _parseJSON(content) {
    if (!content) return null;

    let cleanContent = content.trim();

    // 1. Remove markdown code blocks if present
    const codeBlockMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanContent = codeBlockMatch[1].trim();
    }

    try {
      return JSON.parse(cleanContent);
    } catch (e) {
      // 2. Try to find the first JSON-like structure (array or object)
      const firstBrace = cleanContent.indexOf('{');
      const firstBracket = cleanContent.indexOf('[');

      let startIdx = -1;
      let endChar = '';

      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        endChar = '}';
      } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        endChar = ']';
      }

      if (startIdx !== -1) {
        const lastIdx = cleanContent.lastIndexOf(endChar);
        if (lastIdx !== -1 && lastIdx > startIdx) {
          const possibleJSON = cleanContent.substring(startIdx, lastIdx + 1);
          try {
            return JSON.parse(possibleJSON);
          } catch (innerError) {
            console.error('Failed to parse extracted JSON:', innerError.message);
          }
        }
      }

      throw e; // Rethrow if extraction fails
    }
  }

  /**
   * Analyze a business idea and create initial assessment
   */
  async analyzeIdea(idea) {
    const prompt = `You are a world-class business strategist. Analyze this business idea:

IDEA: ${idea.description}
INDUSTRY: ${idea.industry || 'Not specified'}
TARGET MARKET: ${idea.targetMarket || 'Not specified'}
INITIAL BUDGET: ${idea.budget || 'Not specified'}

Provide a comprehensive analysis as JSON:
{
  "viability": {
    "score": 1-10,
    "reasoning": "Why this score"
  },
  "marketAnalysis": {
    "targetAudience": "Who will buy",
    "marketSize": "Estimated market",
    "competition": "Key competitors",
    "differentiator": "Unique advantage"
  },
  "revenueModel": {
    "primary": "Main revenue stream",
    "secondary": ["Other streams"],
    "pricingStrategy": "How to price"
  },
  "requiredSystems": [
    {"name": "System name", "purpose": "What it does", "priority": "high/medium/low"}
  ],
  "estimatedCosts": {
    "startup": "Initial costs",
    "monthly": "Recurring costs"
  },
  "risks": [
    {"risk": "Description", "mitigation": "How to handle"}
  ],
  "timeline": {
    "mvp": "Time to minimum viable product",
    "profitable": "Time to profitability"
  },
  "immediateNextSteps": ["Step 1", "Step 2", "Step 3"]
}

Return ONLY valid JSON.`;

    const result = await this.ai.complete(prompt, 'reasoning', { format: 'json' });

    if (result.success) {
      try {
        const analysis = this._parseJSON(result.content);
        if (!analysis) throw new Error('Empty content');

        analysis.id = `analysis-${Date.now()}`;
        analysis.ideaDescription = idea.description;
        analysis.createdAt = new Date().toISOString();
        analysis.status = 'analyzed';

        // Save analysis
        const analysisPath = path.join(this.dataDir, `${analysis.id}.json`);
        fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

        this.auditLogger.logSystem('business_analyzed', {
          analysisId: analysis.id,
          viabilityScore: analysis.viability?.score
        });

        return { success: true, analysis };
      } catch (parseError) {
        return { success: false, error: 'Failed to parse analysis', raw: result.content };
      }
    }

    return { success: false, error: result.error };
  }

  /**
   * Generate a full business plan from analysis
   */
  async createBusinessPlan(analysisId) {
    const analysisPath = path.join(this.dataDir, `${analysisId}.json`);
    if (!fs.existsSync(analysisPath)) {
      return { success: false, error: 'Analysis not found' };
    }

    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

    const prompt = `Based on this business analysis, create a detailed execution plan:

${JSON.stringify(analysis, null, 2)}

Create a comprehensive business plan as JSON:
{
  "executiveSummary": "2-3 sentence overview",
  "mission": "Mission statement",
  "vision": "Long-term vision",
  "phases": [
    {
      "name": "Phase name",
      "duration": "Time estimate",
      "objectives": ["What to achieve"],
      "tasks": [
        {
          "name": "Task name",
          "description": "What to do",
          "automated": true/false,
          "requiresApproval": true/false,
          "approvalReason": "Why approval needed (if applicable)",
          "estimatedTime": "Duration",
          "dependencies": ["Other task names"]
        }
      ],
      "milestones": ["Key checkpoints"],
      "budget": "Phase budget"
    }
  ],
  "automationOpportunities": [
    {"area": "What to automate", "benefit": "Why", "complexity": "low/medium/high"}
  ],
  "legalRequirements": [
    {"requirement": "What's needed", "when": "When to do it", "cost": "Estimated cost"}
  ],
  "financialProjections": {
    "month1": {"revenue": 0, "expenses": 0},
    "month3": {"revenue": 0, "expenses": 0},
    "month6": {"revenue": 0, "expenses": 0},
    "month12": {"revenue": 0, "expenses": 0}
  },
  "kpis": ["Key metrics to track"],
  "successCriteria": "How we know it's working"
}

Return ONLY valid JSON.`;

    const result = await this.ai.complete(prompt, 'reasoning', { format: 'json' });

    if (result.success) {
      try {
        const plan = this._parseJSON(result.content);
        if (!plan) throw new Error('Empty content');

        plan.id = `plan-${Date.now()}`;
        plan.analysisId = analysisId;
        plan.status = 'draft';
        plan.createdAt = new Date().toISOString();

        // Save plan
        const planPath = path.join(this.dataDir, `${plan.id}.json`);
        fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

        // Update analysis
        analysis.planId = plan.id;
        analysis.status = 'planned';
        fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

        this.auditLogger.logSystem('business_plan_created', {
          planId: plan.id,
          phases: plan.phases?.length
        });

        return { success: true, plan };
      } catch (parseError) {
        return { success: false, error: 'Failed to parse plan', raw: result.content };
      }
    }

    return { success: false, error: result.error };
  }

  /**
   * Extract actionable tasks from business plan
   */
  async extractTasks(planId) {
    const planPath = path.join(this.dataDir, `${planId}.json`);
    if (!fs.existsSync(planPath)) {
      return { success: false, error: 'Plan not found' };
    }

    const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    const tasks = [];

    for (const phase of plan.phases || []) {
      for (const task of phase.tasks || []) {
        tasks.push({
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          planId,
          phase: phase.name,
          name: task.name,
          description: task.description,
          automated: task.automated,
          requiresApproval: task.requiresApproval,
          approvalReason: task.approvalReason,
          estimatedTime: task.estimatedTime,
          dependencies: task.dependencies,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Save tasks
    const tasksPath = path.join(this.dataDir, `${planId}-tasks.json`);
    fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));

    return { success: true, tasks, count: tasks.length };
  }

  /**
   * Get all businesses
   */
  getAll() {
    const files = fs.readdirSync(this.dataDir)
      .filter(f => f.startsWith('analysis-') && f.endsWith('.json'));

    return files.map(f => {
      const content = fs.readFileSync(path.join(this.dataDir, f), 'utf-8');
      return JSON.parse(content);
    });
  }

  /**
   * Proactively generate business ideas
   * @param {number} count - Number of ideas to generate
   * @param {object} criteria - Optional criteria to guide idea generation
   */
  async generateIdeas(count = 5, criteria = {}) {
    const prompt = `You are an entrepreneurial AI that identifies profitable business opportunities.

CRITERIA:
- Budget: ${criteria.budget || '$1,000 - $10,000 startup'}
- Industry focus: ${criteria.industries?.join(', ') || 'Any - prefer digital, service-based, or automation'}
- Time to profit: ${criteria.timeToProfit || '1-3 months'}
- Automation potential: ${criteria.automationLevel || 'High - prefer businesses that can run autonomously'}
- Skills available: ${criteria.skills?.join(', ') || 'AI/automation, web development, marketing, content creation'}

Generate ${count} unique, actionable business ideas. For each idea, consider:
1. Low barrier to entry
2. High automation potential
3. Recurring revenue possibility
4. Scalability without proportional effort

Return as JSON array:
[
  {
    "name": "Business name",
    "description": "2-3 sentence description",
    "industry": "Industry category",
    "targetMarket": "Who the customers are",
    "revenueModel": "How it makes money",
    "estimatedStartupCost": "$X - $Y",
    "estimatedMonthlyRevenue": "$X - $Y (after 6 months)",
    "automationPotential": "high/medium/low",
    "competitionLevel": "high/medium/low",
    "uniqueAngle": "What makes this different",
    "firstStep": "The very first action to take"
  }
]

Return ONLY valid JSON array.`;

    const result = await this.ai.complete(prompt, 'reasoning', { format: 'json' });

    if (result.success) {
      try {
        const ideas = this._parseJSON(result.content);
        if (!ideas) throw new Error('Empty content');

        // Save ideas
        const ideasPath = path.join(this.dataDir, `ideas-${Date.now()}.json`);
        fs.writeFileSync(ideasPath, JSON.stringify({
          generatedAt: new Date().toISOString(),
          criteria,
          ideas
        }, null, 2));

        this.auditLogger.logSystem('ideas_generated', {
          count: ideas.length,
          criteria
        });

        return { success: true, ideas, count: ideas.length };
      } catch (parseError) {
        return { success: false, error: 'Failed to parse ideas', raw: result.content };
      }
    }

    return { success: false, error: result.error };
  }

  /**
   * Rank and score generated ideas
   * @param {array} ideas - Array of business ideas
   */
  async rankIdeas(ideas) {
    const prompt = `You are a business analyst. Score and rank these business ideas.

IDEAS:
${JSON.stringify(ideas, null, 2)}

For each idea, provide scores (1-10) for:
1. Viability - How realistic is this?
2. Profitability - Revenue potential
3. Automation - Can it run autonomously?
4. Speed - How fast to first revenue?
5. Scalability - Growth potential

Return as JSON array sorted by total score (highest first):
[
  {
    "name": "Business name",
    "scores": {
      "viability": 8,
      "profitability": 7,
      "automation": 9,
      "speed": 8,
      "scalability": 7,
      "total": 39
    },
    "recommendation": "brief recommendation",
    "risks": ["risk 1", "risk 2"],
    "rank": 1
  }
]

Return ONLY valid JSON array.`;

    const result = await this.ai.complete(prompt, 'reasoning', { format: 'json' });

    if (result.success) {
      try {
        const rankedIdeas = this._parseJSON(result.content);
        if (!rankedIdeas) throw new Error('Empty content');

        return { success: true, rankedIdeas };
      } catch (parseError) {
        return { success: false, error: 'Failed to parse ranking', raw: result.content };
      }
    }

    return { success: false, error: result.error };
  }

  /**
   * Execute from orchestrator
   */
  async execute(task) {
    switch (task.action) {
      case 'analyze':
        return this.analyzeIdea(task.data);
      case 'plan':
        return this.createBusinessPlan(task.data.analysisId);
      case 'extract_tasks':
        return this.extractTasks(task.data.planId);
      case 'list':
        return this.getAll();
      case 'generate_ideas':
        return this.generateIdeas(task.data?.count, task.data?.criteria);
      case 'rank_ideas':
        return this.rankIdeas(task.data.ideas);
      default:
        throw new Error(`Unknown action: ${task.action}`);
    }
  }
}

export default BusinessAnalyzer;

