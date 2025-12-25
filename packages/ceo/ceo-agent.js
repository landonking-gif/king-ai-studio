/**
 * CEO Agent - The autonomous business runner
 * Takes ideas, creates plans, builds systems, and runs businesses
 * Always asks for human approval on legal/financial decisions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { Database } from '../core/database.js';
import { ModelRouter } from '../core/model-router.js';
import { AuditLogger } from '../core/audit-logger.js';
import { ApprovalFlow } from '../core/approval-flow.js';
import { EmailNotifier } from '../core/email-notifier.js';
import { BusinessAnalyzer } from './business-analyzer.js';
import { PortfolioManager } from '../core/portfolio-manager.js';
import { Negotiator } from '../core/negotiator.js';
import { OpportunityScanner } from '../expansion/opportunity-scanner.js';
import { PaymentManager } from '../core/payment-manager.js';
import { SelfHealer } from '../core/self-healer.js';
import { LeadSynergest } from '../core/lead-synergest.js';
import { PromptSelfOptimizer } from '../core/prompt-self-optimizer.js';
import { ContentArbitrage } from '../modules/content-arbitrage.js';
import { LegalAutopilot } from '../modules/legal-autopilot.js';
import { AffiliateManager } from '../modules/affiliate-manager.js';
import { ArbitrageDetector } from '../modules/arbitrage-detector.js';
import { SEOGen } from '../modules/seo-engine.js';
import { DynamicPricer } from '../core/price-optimizer.js';
import { EmpireTranslator } from '../expansion/empire-translator.js';
import { AssetScouter } from '../expansion/asset-scouter.js';
import { CLVPredictor } from '../core/clv-predictor.js';
import { InfluencerBot } from '../modules/influencer-bot.js';
import { AdManager } from '../core/ad-manager.js';
import { AgencyPackager } from '../expansion/agency-packager.js';
import { SecurityVault } from '../core/security-vault.js';
import { VideoLab } from '../modules/video-lab.js';
import { DomainManager } from '../modules/domain-manager.js';
import { EmailCampaigner } from '../modules/email-campaigner.js';
import { ChurnReducer } from '../core/churn-reducer.js';
import { SalesCloser } from '../modules/sales-closer.js';
import { IPWatcher } from '../modules/ip-watcher.js';
import { TaxEngine } from '../core/tax-engine.js';
import { MicroSaaSGenerator } from '../modules/micro-saas-gen.js';
import { FailoverLoadBalancer } from '../core/load-balancer.js';
import { MultiCurrencyLedger } from '../core/ledger.js';
import { RefundHandler } from '../modules/refund-handler.js';
import { ReferralEngine } from '../modules/referral-engine.js';
import { AdsOptimizer } from '../core/ads-optimizer.js';
import { PivotEngine } from './pivot-engine.js';
import { HiringBot } from '../modules/hiring-bot.js';
import { CompetitiveIntelligence } from '../modules/competitor-intel.js';
import { SentimentTracker } from '../core/sentiment-tracker.js';
import { BundleOptimizer } from '../core/bundle-optimizer.js';
import { SelfRefactorer } from '../core/self-refactorer.js';
import { ViralLoopGenerator } from '../modules/viral-gen.js';
import { LandingPageOptimizer } from '../modules/landing-page-optimizer.js';
import { PressReleaseBot } from '../modules/pr-bot.js';
import { SuccessAI } from '../core/success-ai.js';
import { APIMonetizer } from '../expansion/api-monetizer.js';
import { UpsellEngine } from '../modules/upsell-engine.js';
import { SubscriptionOptimizer } from '../core/subscription-optimizer.js';
import { ExpenseOptimizer } from '../modules/expense-optimizer.js';
import { MarketTimingBot } from '../modules/market-timing.js';
import { MultiAgentReviewer } from '../core/multi-agent-reviewer.js';
import { PartnershipScout } from '../modules/partnership-scout.js';
import { KnowledgeBaseGen } from '../modules/kb-gen.js';
import { RecursiveInterviewer } from '../modules/recursive-interviewer.js';
import { EdgeProxySwarm } from '../core/proxy-swarm.js';
import { SocialProofEngine } from '../modules/social-proof.js';
import { ResourceArbiter } from '../core/resource-arbiter.js';
import { LegalDefenseHub } from '../modules/defense-hub.js';
import { LeadExchange } from '../core/lead-exchange.js';
import { MultiTaxOptimizer } from '../modules/tax-optimizer.js';
import { VoiceSalesAgent } from '../modules/voice-agent.js';

import { MacroTrendScanner } from '../modules/macro-trend-scanner.js';
import { VideoSpinner } from '../modules/video-spinner.js';
import { FingerprintV2 } from '../core/fingerprint-v2.js';
import { PsychDiscount } from '../modules/psych-discount.js';
import { LinkedInSniper } from '../modules/linkedin-sniper.js';
import { ConsumerPanelLab } from '../modules/consumer-panel.js';
import { BrandCohesionAgent } from '../modules/brand-cohesion.js';
import { InfraPivot } from '../core/infra-pivot.js';
import { IndexingEngine } from '../modules/indexing-engine.js';
import { ReferralLoop } from '../modules/referral-loop.js';
import { AdSpy } from '../modules/ad-spy.js';
import { VideoDubber } from '../modules/video-dubber.js';
import { InventoryHedging } from '../modules/inventory-hedging.js';
import { AssetOptimizer } from '../core/asset-optimizer.js';
import { BarterLogic } from '../core/barter-logic.js';
import { TrustSignalLab } from '../modules/trust-signal.js';
import { CommunitySentimentAlpha } from '../modules/community-sentiment.js';
import { QuoteArchitect } from '../modules/quote-architect.js';
import { UGCFactory } from '../modules/ugc-factory.js';
import { ZeroDayPatcher } from '../core/zero-day-patcher.js';
import { SentimentArbitrage } from '../modules/sentiment-arbitrage.js';
import { LocalMapDominator } from '../modules/local-map-dominator.js';
import { ViralHookGen } from '../modules/viral-hook-gen.js';
import { ProfitDashboard } from '../core/profit-dashboard.js';
import { PricingWarBot } from '../modules/pricing-war-bot.js';
import { DecentralizedBackup } from '../core/decentralized-backup.js';
import { AssetAppraisal } from '../modules/asset-appraisal.js';
import { SubjectLineOptimizer } from '../modules/subject-line-optimizer.js';
import { HandoffBot } from '../modules/handoff-bot.js';
import { CitationSwarm } from '../modules/citation-swarm.js';
import { DisasterRecoverySandbox } from '../core/dr-sandbox.js';
import { SloganTester } from '../modules/slogan-tester.js';
import { BacklinkMonitor } from '../modules/backlink-monitor.js';
import { PsychCopyGen } from '../modules/psych-copy-gen.js';
import { WebinarArchitect } from '../modules/webinar-architect.js';
import { PPPPricing } from '../modules/ppp-pricing.js';
import { SuccessStoryGen } from '../modules/success-story-gen.js';
import { PartnershipHunter } from '../modules/partnership-hunter.js';
import { AutonomousPM } from '../core/autonomous-pm.js';
import { LiquidityHeartbeat } from '../core/liquidity-heartbeat.js';

import { SelfEvaluator } from '../core/self-evaluator.js';
import { StrategyManager } from '../core/strategy-manager.js';
import { MetaLearner } from '../core/meta-learner.js';

export class CEOAgent {
    constructor(config = {}) {
        this.ai = config.aiProvider || config.modelRouter || new ModelRouter(config);
        this.auditLogger = config.auditLogger || new AuditLogger();
        this.approvalFlow = config.approvalFlow;
        this.emailNotifier = config.emailNotifier;
        this.businessAnalyzer = new BusinessAnalyzer({ ...config, modelRouter: this.ai });
        this.db = config.db || new Database(config);

        // Recursive Governance Modules
        this.selfEvaluator = new SelfEvaluator({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.strategyManager = new StrategyManager();
        this.metaLearner = new MetaLearner({ modelRouter: this.ai, auditLogger: this.auditLogger });

        // Strategic Modules (ROI-1 to 5)
        this.portfolio = new PortfolioManager({ db: this.db, auditLogger: this.auditLogger });
        this.negotiator = new Negotiator({ db: this.db, modelRouter: this.ai, auditLogger: this.auditLogger });
        this.scanner = new OpportunityScanner({ db: this.db, modelRouter: this.ai, auditLogger: this.auditLogger });
        this.payments = new PaymentManager({ db: this.db });
        this.healer = new SelfHealer({ modelRouter: this.ai, auditLogger: this.auditLogger });

        // Expansion Modules (ROI-6 to 10)
        this.crm = new LeadSynergest({ db: this.db, auditLogger: this.auditLogger });
        this.optimizer = new PromptSelfOptimizer({ db: this.db, modelRouter: this.ai, auditLogger: this.auditLogger });
        this.content = new ContentArbitrage({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.legal = new LegalAutopilot({ db: this.db, auditLogger: this.auditLogger });
        this.affiliates = new AffiliateManager({ db: this.db, modelRouter: this.ai, auditLogger: this.auditLogger });

        // Market Intelligence (ROI-11 to 15)
        this.arbitrage = new ArbitrageDetector({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.seo = new SEOGen({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.pricing = new DynamicPricer({ db: this.db, modelRouter: this.ai });
        this.translator = new EmpireTranslator({ modelRouter: this.ai });
        this.scouter = new AssetScouter({ modelRouter: this.ai, auditLogger: this.auditLogger });

        // Growth & Scaling (ROI-16 to 20)
        this.clv = new CLVPredictor({ modelRouter: this.ai });
        this.influencers = new InfluencerBot({ modelRouter: this.ai, emailNotifier: this.emailNotifier });
        this.ads = new AdManager({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.agency = new AgencyPackager({ modelRouter: this.ai });
        // NOTE: ModelRouter already handles Dark-Pool (ROI #20)

        // Operations & Resilience (ROI-21 to 25)
        this.vault = new SecurityVault(config);
        this.video = new VideoLab({ modelRouter: this.ai });
        this.domains = new DomainManager({ db: this.db, auditLogger: this.auditLogger });
        this.outreach = new EmailCampaigner({ modelRouter: this.ai, emailNotifier: this.emailNotifier });
        this.retention = new ChurnReducer({ modelRouter: this.ai, auditLogger: this.auditLogger });

        // High-ROI Modules (ROI-26 to 30)
        this.closer = new SalesCloser({ modelRouter: this.ai });
        this.ip = new IPWatcher({ auditLogger: this.auditLogger });
        this.tax = new TaxEngine({ db: this.db });
        this.saasGen = new MicroSaaSGenerator({ db: this.db, modelRouter: this.ai });
        this.loadBalancer = new FailoverLoadBalancer();

        // Financial & Strategic Optimization (ROI-31 to 35)
        this.ledger = new MultiCurrencyLedger({ db: this.db });
        this.refunds = new RefundHandler({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.referrals = new ReferralEngine({ db: this.db });
        this.adsOptimizer = new AdsOptimizer({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.pivot = new PivotEngine({ db: this.db, modelRouter: this.ai });

        // Operational Scaling (ROI-36 to 40)
        this.hiring = new HiringBot({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.intel = new CompetitiveIntelligence({ db: this.db, modelRouter: this.ai });
        this.sentiment = new SentimentTracker({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.bundler = new BundleOptimizer({ modelRouter: this.ai });
        this.refactorer = new SelfRefactorer({ modelRouter: this.ai, auditLogger: this.auditLogger });

        // Growth & Monetization (ROI-41 to 45)
        this.virality = new ViralLoopGenerator({ modelRouter: this.ai });
        this.lpo = new LandingPageOptimizer({ modelRouter: this.ai });
        this.pr = new PressReleaseBot({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.success = new SuccessAI({ modelRouter: this.ai, emailNotifier: this.emailNotifier });
        this.monetizer = new APIMonetizer({ modelRouter: this.ai });

        // Operational Optimization (ROI-46 to 50)
        this.upsells = new UpsellEngine({ modelRouter: this.ai });
        this.subOptimizer = new SubscriptionOptimizer({ modelRouter: this.ai, emailNotifier: this.emailNotifier });
        this.expenseOptimizer = new ExpenseOptimizer({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.timing = new MarketTimingBot({ modelRouter: this.ai });
        this.reviewer = new MultiAgentReviewer({ modelRouter: this.ai });

        // Niche Domination & Expansion (ROI-51 to 55)
        this.scout = new PartnershipScout({ modelRouter: this.ai, auditLogger: this.auditLogger });
        this.kb = new KnowledgeBaseGen({ modelRouter: this.ai });
        this.interviewer = new RecursiveInterviewer({ modelRouter: this.ai, emailNotifier: this.emailNotifier });
        this.proxySwarm = new EdgeProxySwarm();
        this.socialProof = new SocialProofEngine({ modelRouter: this.ai });

        // Advanced Logic & Sales (ROI-56 to 60)
        this.arbiter = new ResourceArbiter({ db: this.db });
        this.defense = new LegalDefenseHub({ modelRouter: this.ai });
        this.leadExchange = new LeadExchange({ db: this.db, auditLogger: this.auditLogger });
        this.taxOptimizer = new MultiTaxOptimizer({ modelRouter: this.ai });
        this.voice = new VoiceSalesAgent({ modelRouter: this.ai });

        // Hyper-Optimization (ROI-61 to 65)
        this.macro = new MacroTrendScanner({ modelRouter: this.ai });
        this.spinner = new VideoSpinner({ modelRouter: this.ai });
        this.fingerprint = new FingerprintV2();
        this.psych = new PsychDiscount({ modelRouter: this.ai });
        this.sniper = new LinkedInSniper({ modelRouter: this.ai, auditLogger: this.auditLogger });

        // Infrastructure & Efficiency (ROI-66 to 70)
        this.panel = new ConsumerPanelLab({ modelRouter: this.ai });
        this.brand = new BrandCohesionAgent({ modelRouter: this.ai });
        this.infra = new InfraPivot();
        this.indexing = new IndexingEngine();
        this.refLoop = new ReferralLoop({ modelRouter: this.ai, emailNotifier: this.emailNotifier });

        // Market Dominance & Optimization (ROI-71 to 75)
        this.adSpy = new AdSpy({ modelRouter: this.ai });
        this.dubber = new VideoDubber({ modelRouter: this.ai });
        this.hedging = new InventoryHedging({ modelRouter: this.ai });
        this.assetOpt = new AssetOptimizer();
        this.barter = new BarterLogic({ db: this.db });

        // Revenue & Resilience (ROI-76 to 80)
        this.trust = new TrustSignalLab({ modelRouter: this.ai });
        this.alpha = new CommunitySentimentAlpha({ modelRouter: this.ai });
        this.quoter = new QuoteArchitect({ modelRouter: this.ai });
        this.ugc = new UGCFactory({ modelRouter: this.ai });
        this.patcher = new ZeroDayPatcher();

        // Aggressive Expansion (ROI-81 to 85)
        this.fomo = new SentimentArbitrage({ modelRouter: this.ai });
        this.local = new LocalMapDominator({ modelRouter: this.ai });
        this.hook = new ViralHookGen({ modelRouter: this.ai });
        this.dashHelper = new ProfitDashboard({ db: this.db });
        this.warBot = new PricingWarBot({ modelRouter: this.ai });

        // End-Game Optimization (ROI-86 to 90)
        this.backup = new DecentralizedBackup();
        this.appraiser = new AssetAppraisal({ modelRouter: this.ai });
        this.subjectLine = new SubjectLineOptimizer({ modelRouter: this.ai });
        this.handoff = new HandoffBot();
        this.citations = new CitationSwarm();

        // Apex Optimization (ROI-91 to 95)
        this.drSandbox = new DisasterRecoverySandbox({ ceo: this });
        this.slogan = new SloganTester({ modelRouter: this.ai });
        this.backlinks = new BacklinkMonitor({ modelRouter: this.ai });
        this.copyGen = new PsychCopyGen({ modelRouter: this.ai });
        this.webinar = new WebinarArchitect({ modelRouter: this.ai });

        // THE FINALE (ROI-96 to 100)
        this.ppp = new PPPPricing();
        this.stories = new SuccessStoryGen({ modelRouter: this.ai });
        this.hunter = new PartnershipHunter({ modelRouter: this.ai });
        this.pm = new AutonomousPM({ ceo: this });
        this.heartbeat = new LiquidityHeartbeat({ db: this.db });

        this.dataDir = config.dataDir || path.join(__dirname, '../../data/ceo');
        this.ensureDataDir();

        this.activeBusiness = null;
        this.executionQueue = [];
        this.progressLog = [];
        this.latestHighlight = "Idle / Scouting the next big opportunity.";
    }

    /**
     * Handle direct command from User/Admin (Chat Interface)
     */
    async handleCommand(command) {
        console.log(`[CEOAgent] 🗣️ Received command: "${command}"`);

        // 1. Basic status check (fast path)
        if (command.toLowerCase() === 'status') {
            const status = this.getStatus();
            return {
                reply: `Current Status: ${status.status.toUpperCase()}\nActive Venture: ${status.activeBusiness?.idea || 'None'}\nPending Approvals: ${status.pendingApprovals}`,
                thoughts: "Providing immediate status report as requested."
            };
        }

        // 2. AI Processing
        const context = `
You are the CEO Agent of King AI Studio.
Current Status: ${this.activeBusiness ? 'Running Business: ' + this.activeBusiness.idea : 'Idle / Scouting'}
Pending Approvals: ${this.getStatus().pendingApprovals}
Recent Activity: ${this.progressLog.slice(-3).map(l => l.message).join(', ')}

The User (Chairman/Admin) has sent this command: "${command}"

Instructions:
1. Interpret the intent (Question, Instruction, or Chat).
2. Formulate a professional, executive response.
3. If the command requires an action (like "stop", "pause", "start"), confirm you will do it (the system will handle the actual trigger separately for now).

Return ONLY JSON:
{
  "reply": "Your response to the user",
  "thoughts": "Your internal reasoning",
  "intent": "question|instruction|chat",
  "suggestedAction": "none|stop|pause|start_new"
}`;

        try {
            const result = await this.ai.complete(context, 'fast', { format: 'json' });
            if (result.success) {
                let parsed = {};
                try {
                    parsed = JSON.parse(result.content);
                } catch (e) {
                    // Fallback if AI returns plain text
                    parsed = { reply: result.content, thoughts: "Processed raw response.", intent: "chat" };
                }

                // Log the interaction
                this.logProgress(`User Command: ${command} -> Intent: ${parsed.intent}`, 'chat');

                return parsed;
            } else {
                return {
                    reply: "I am having trouble connecting to my neural core. Please try again.",
                    thoughts: "AI Connection Failed: " + result.error
                };
            }
        } catch (e) {
            console.error("Command handling error:", e);
            return {
                reply: "An internal error occurred while processing your command.",
                thoughts: e.message
            };
        }
    }

    async init() {
        await this.db.init();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Log progress and optionally notify user
     */
    async logProgress(message, type = 'info', notify = false) {
        const entry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            businessId: this.activeBusiness?.id
        };

        this.progressLog.push(entry);
        this.latestHighlight = message; // Update highlight for real-time flow
        console.log(`[CEO ${type.toUpperCase()}] ${message}`);

        // Save to file
        const logPath = path.join(this.dataDir, 'progress.jsonl');
        fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');

        // Save to database
        if (this.db) {
            await this.db.log(this.activeBusiness?.id, type, message);
        }

        // Send email notification for important updates
        if (notify && this.emailNotifier) {
            try {
                const title = `[King AI CEO] ${type.toUpperCase()}`;
                await this.emailNotifier.sendNotification(title, message);
            } catch (err) {
                console.error('Failed to send notification:', err.message);
            }
        }

        this.auditLogger.logSystem('ceo_progress', entry);
        return entry;
    }

    /**
     * Request approval for legal/financial decisions
     */
    async requestApproval(decision) {
        if (this.approvalFlow) {
            return this.approvalFlow.submit({
                ...decision,
                module: 'ceo',
                automated: true // Allow re-submitting to orchestrator
            });
        }

        const request = {
            id: `approval-${Date.now()}`,
            type: decision.type, // 'legal' or 'financial'
            title: decision.title,
            description: decision.description,
            amount: decision.amount,
            impact: decision.impact,
            alternatives: decision.alternatives || [],
            recommendation: decision.recommendation,
            urgency: decision.urgency || 'normal',
            requestedAt: new Date().toISOString(),
            status: 'pending'
        };

        await this.logProgress(
            `🔒 APPROVAL REQUIRED: ${request.title}\n` +
            `Type: ${request.type}\n` +
            `Description: ${request.description}\n` +
            `Impact: ${request.impact}`,
            'approval_needed',
            true // Send email
        );

        // Save pending approval
        const approvalsPath = path.join(this.dataDir, 'pending-approvals.json');
        let approvals = [];
        if (fs.existsSync(approvalsPath)) {
            approvals = JSON.parse(fs.readFileSync(approvalsPath, 'utf-8'));
        }
        approvals.push(request);
        fs.writeFileSync(approvalsPath, JSON.stringify(approvals, null, 2));

        return request;
    }

    /**
     * Check if a task requires approval
     */
    requiresApproval(task) {
        const legalKeywords = ['legal', 'contract', 'agreement', 'license', 'trademark', 'copyright', 'lawsuit', 'attorney', 'register', 'incorporation', 'llc', 'corporation'];
        const financialKeywords = ['payment', 'transfer', 'bank', 'invoice', 'subscription', 'purchase', 'buy', 'spend', 'invest', 'loan', 'credit'];

        const taskText = `${task.name} ${task.description}`.toLowerCase();

        for (const keyword of legalKeywords) {
            if (taskText.includes(keyword)) {
                return { required: true, type: 'legal', reason: `Contains legal keyword: ${keyword}` };
            }
        }

        for (const keyword of financialKeywords) {
            if (taskText.includes(keyword)) {
                return { required: true, type: 'financial', reason: `Contains financial keyword: ${keyword}` };
            }
        }

        return { required: false };
    }

    /**
     * Start a new business from an idea
     */
    async startBusiness(idea) {
        await this.logProgress(`🚀 Starting new business analysis: ${idea.description}`, 'start', true);

        // Step 1: Analyze the idea
        this.latestHighlight = "Performing deep market analysis on new idea...";
        await this.logProgress('📊 Analyzing business idea...', 'progress');
        const analysisResult = await this.businessAnalyzer.analyzeIdea(idea);

        if (!analysisResult.success) {
            await this.logProgress(`❌ Analysis failed: ${analysisResult.error}`, 'error', true);
            return analysisResult;
        }

        const analysis = analysisResult.analysis;
        await this.logProgress(
            `✅ Analysis complete!\n` +
            `   Viability Score: ${analysis.viability?.score}/10\n` +
            `   Target Market: ${analysis.marketAnalysis?.targetAudience}\n` +
            `   Revenue Model: ${analysis.revenueModel?.primary}`,
            'milestone',
            true
        );

        // Step 2: Create business plan
        await this.logProgress('📋 Creating detailed business plan...', 'progress');
        const planResult = await this.businessAnalyzer.createBusinessPlan(analysis.id);

        if (!planResult.success) {
            await this.logProgress(`❌ Planning failed: ${planResult.error}`, 'error', true);
            return planResult;
        }

        const plan = planResult.plan;
        await this.logProgress(
            `✅ Business plan created!\n` +
            `   Phases: ${plan.phases?.length}\n` +
            `   Mission: ${plan.mission}`,
            'milestone',
            true
        );

        // Step 3: Extract and queue tasks
        await this.logProgress('📝 Extracting actionable tasks...', 'progress');
        const tasksResult = await this.businessAnalyzer.extractTasks(plan.id);

        if (!tasksResult.success) {
            await this.logProgress(`❌ Task extraction failed: ${tasksResult.error}`, 'error', true);
            return tasksResult;
        }

        await this.logProgress(
            `✅ Found ${tasksResult.count} tasks to execute\n` +
            `   Ready to begin execution phase`,
            'milestone',
            true
        );

        // Set as active business
        this.activeBusiness = {
            id: analysis.id,
            planId: plan.id,
            idea: idea.description,
            status: 'planned',
            tasks: tasksResult.tasks,
            startedAt: new Date().toISOString()
        };

        // Save state
        this.saveState();

        return {
            success: true,
            business: this.activeBusiness,
            analysis,
            plan,
            tasks: tasksResult.tasks,
            message: 'Business analyzed and planned. Ready to execute. Run executePlan() to begin.'
        };
    }

    /**
     * Execute the business plan
     */
    async executePlan() {
        if (!this.activeBusiness) {
            return { success: false, error: 'No active business. Run startBusiness() first.' };
        }

        await this.logProgress(
            `⚡ Beginning execution of business plan\n` +
            `   Business: ${this.activeBusiness.idea}\n` +
            `   Tasks: ${this.activeBusiness.tasks.length}`,
            'start',
            true
        );

        const results = [];
        let completedCount = 0;
        let pendingApprovalCount = 0;

        for (const task of this.activeBusiness.tasks) {
            // Check if task requires approval
            const approvalCheck = this.requiresApproval(task);

            if (approvalCheck.required || task.requiresApproval) {
                // Request approval and pause
                await this.requestApproval({
                    type: approvalCheck.type || 'legal',
                    title: task.name,
                    description: task.description,
                    impact: `Part of phase: ${task.phase}`,
                    recommendation: 'Please review and approve to continue'
                });

                pendingApprovalCount++;
                task.status = 'awaiting_approval';
                results.push({ task: task.name, status: 'awaiting_approval' });
                continue;
            }

            // Execute automated task
            if (task.automated) {
                this.latestHighlight = `Executing task: ${task.name}...`;
                await this.logProgress(`🛠️ Executing: ${task.name}`, 'progress');

                // Simulate or actually execute the task
                const execResult = await this.executeTask(task);
                task.status = execResult.success ? 'completed' : 'failed';
                task.result = execResult;
                completedCount++;

                results.push({ task: task.name, status: task.status });
            } else {
                await this.logProgress(`📌 Manual task identified: ${task.name}`, 'info');
                task.status = 'manual_required';
                results.push({ task: task.name, status: 'manual_required' });
            }
        }

        // Save state
        this.saveState();

        await this.logProgress(
            `📈 Execution Progress:\n` +
            `   Completed: ${completedCount}\n` +
            `   Pending Approval: ${pendingApprovalCount}\n` +
            `   Manual: ${results.filter(r => r.status === 'manual_required').length}`,
            'milestone',
            true
        );

        return {
            success: true,
            results,
            summary: {
                completed: completedCount,
                pendingApproval: pendingApprovalCount,
                manual: results.filter(r => r.status === 'manual_required').length
            }
        };
    }

    /**
     * Execute a single task with recursive self-correction
     */
    async executeTask(task) {
        console.log(`[CEOAgent] 🚀 Executing task: ${task.name}`);

        // Step 1: Get applicable strategies
        const strategies = this.strategyManager.getApplicableStrategies(task.phase || 'general');

        // Step 2: Initial implementation plan / system description
        const prompt = `Given this business task, describe what systems/code need to be built:

Task: ${task.name}
Description: ${task.description}
Phase: ${task.phase}

Applied Strategies:
${strategies.map(s => `- ${s}`).join('\n')}

Return a JSON object with:
{
  "systemsNeeded": ["list of systems/modules to build"],
  "automationPossible": true/false,
  "implementation": "Brief description of how to implement",
  "estimatedEffort": "low/medium/high"
}`;

        const initialResult = await this.ai.complete(prompt, 'reasoning', { format: 'json' });

        if (!initialResult.success) {
            return { success: false, error: initialResult.error };
        }

        let initialOutput;
        try {
            initialOutput = JSON.parse(initialResult.content);
        } catch (e) {
            initialOutput = initialResult.content;
        }

        // Step 3: Self-Correction Loop (Critique -> Rewrite -> Verify)
        const refinedResult = await this.selfEvaluator.evaluateAndImprove(
            `Task: ${task.name}\nDescription: ${task.description}`,
            initialOutput,
            strategies
        );

        // Step 4: Reflection & Learning
        const reflection = await this.reflectOnPerformance(task, refinedResult);

        // Step 5: Final Result Construction
        return {
            success: true,
            final_answer: refinedResult.final_output,
            verification_notes: refinedResult.verification_notes,
            strategy_update: reflection.strategyUpdate,
            improvements: refinedResult.improvements,
            meta_learning: reflection.metaLearning
        };
    }

    /**
     * Reflect on task performance and update strategies/principles
     * @param {object} task 
     * @param {object} result 
     */
    async reflectOnPerformance(task, result) {
        console.log(`[CEOAgent] 🧘 Reflecting on performance for task: ${task.name}`);

        // Update Strategy Manager
        const strategyUpdate = await this.strategyManager.updateStrategy({
            taskType: task.phase || 'general',
            success: true,
            critique: result.critique,
            improvements: result.improvements
        });

        // Update Meta Learner (System Prompt)
        const metaLearning = await this.metaLearner.extractPrinciples({
            taskDescription: task.name,
            finalOutput: result.final_output,
            critique: result.critique,
            wasRewritten: result.was_rewritten
        });

        if (this.auditLogger) {
            this.auditLogger.logSystem('reflection', {
                taskId: task.id,
                taskName: task.name,
                wasRewritten: result.was_rewritten,
                principlesLearned: metaLearning
            });
        }

        return { strategyUpdate, metaLearning };
    }

    /**
     * Get current status
     */
    getStatus() {
        const approvalsPath = path.join(this.dataDir, 'pending-approvals.json');
        let pendingApprovals = [];
        if (fs.existsSync(approvalsPath)) {
            pendingApprovals = JSON.parse(fs.readFileSync(approvalsPath, 'utf-8'))
                .filter(a => a.status === 'pending');
        }

        return {
            activeBusiness: this.activeBusiness,
            pendingApprovals: pendingApprovals.length,
            recentProgress: this.progressLog.slice(-10),
            latestHighlight: this.latestHighlight,
            status: this.activeBusiness ? 'running' : 'idle'
        };
    }

    /**
     * Approve a pending decision
     */
    approveDecision(approvalId, notes = '') {
        const approvalsPath = path.join(this.dataDir, 'pending-approvals.json');
        if (!fs.existsSync(approvalsPath)) {
            return { success: false, error: 'No pending approvals' };
        }

        const approvals = JSON.parse(fs.readFileSync(approvalsPath, 'utf-8'));
        const approval = approvals.find(a => a.id === approvalId);

        if (!approval) {
            return { success: false, error: 'Approval not found' };
        }

        approval.status = 'approved';
        approval.approvedAt = new Date().toISOString();
        approval.notes = notes;

        fs.writeFileSync(approvalsPath, JSON.stringify(approvals, null, 2));

        this.logProgress(`✅ Approved: ${approval.title}`, 'approval', true);

        return { success: true, approval };
    }

    /**
     * Reject a pending decision
     */
    rejectDecision(approvalId, reason) {
        const approvalsPath = path.join(this.dataDir, 'pending-approvals.json');
        if (!fs.existsSync(approvalsPath)) {
            return { success: false, error: 'No pending approvals' };
        }

        const approvals = JSON.parse(fs.readFileSync(approvalsPath, 'utf-8'));
        const approval = approvals.find(a => a.id === approvalId);

        if (!approval) {
            return { success: false, error: 'Approval not found' };
        }

        approval.status = 'rejected';
        approval.rejectedAt = new Date().toISOString();
        approval.rejectionReason = reason;

        fs.writeFileSync(approvalsPath, JSON.stringify(approvals, null, 2));

        this.logProgress(`❌ Rejected: ${approval.title} - ${reason}`, 'rejection', true);

        return { success: true, approval };
    }

    /**
     * Run the autonomous empire loop
     * Continuously generates ideas, picks the best, and starts businesses
     * @param {object} config - Empire loop configuration
     */
    async runEmpireLoop(config = {}) {
        const loopInterval = config.loopInterval || 24 * 60 * 60 * 1000; // Default: 24 hours
        const ideasPerCycle = config.ideasPerCycle || 5;
        const maxConcurrentBusinesses = config.maxConcurrentBusinesses || 3;
        const criteria = config.criteria || {};

        await this.logProgress(
            '🏛️ EMPIRE MODE ACTIVATED\n' +
            `   Ideas per cycle: ${ideasPerCycle}\n` +
            `   Max concurrent: ${maxConcurrentBusinesses}\n` +
            `   Loop interval: ${loopInterval / 1000 / 60} minutes`,
            'empire_start',
            true
        );

        let cycleCount = 0;
        let isRunning = true;

        // Store empire state
        this.empireState = {
            isRunning: true,
            startedAt: new Date().toISOString(),
            cycleCount: 0,
            businessesStarted: [],
            config
        };
        this.saveEmpireState();

        while (isRunning && this.empireState.isRunning) {
            cycleCount++;
            await this.logProgress(`🔄 Empire Cycle ${cycleCount} starting...`, 'empire_cycle');

            try {
                // Step 1: Generate ideas
                this.latestHighlight = "Scanning market for high-ROI opportunities...";
                await this.logProgress('💡 Generating business ideas...', 'progress');
                const ideasResult = await this.businessAnalyzer.generateIdeas(ideasPerCycle, criteria);

                if (!ideasResult.success) {
                    await this.logProgress(`❌ Idea generation failed: ${ideasResult.error}`, 'error');
                    await this.sleep(loopInterval);
                    continue;
                }

                await this.logProgress(`✅ Generated ${ideasResult.count} ideas`, 'milestone');

                // Step 2: Rank ideas
                this.latestHighlight = `Ranking ${ideasResult.ideas.length} potential ventures...`;
                await this.logProgress('📊 Ranking ideas...', 'progress');
                const rankResult = await this.businessAnalyzer.rankIdeas(ideasResult.ideas);

                if (!rankResult.success) {
                    await this.logProgress(`❌ Ranking failed: ${rankResult.error}`, 'error');
                    await this.sleep(loopInterval);
                    continue;
                }

                if (!rankResult.rankedIdeas || rankResult.rankedIdeas.length === 0) {
                    await this.logProgress('⚠️ No ranked ideas returned by AI. Retrying next cycle.', 'warning');
                    await this.sleep(loopInterval);
                    continue;
                }

                // Step 3: Pick the top idea
                const topIdea = rankResult.rankedIdeas[0];
                if (!topIdea || !topIdea.name) {
                    await this.logProgress('❌ Top idea is malformed or missing name. Skipping...', 'error');
                    await this.sleep(loopInterval);
                    continue;
                }

                await this.logProgress(
                    `🎯 Top Idea Selected:\n` +
                    `   Name: ${topIdea.name}\n` +
                    `   Score: ${topIdea.scores?.total || 'N/A'}/50\n` +
                    `   Recommendation: ${topIdea.recommendation || 'No recommendation'}`,
                    'milestone',
                    true
                );

                // Step 4: Check if we can start another business
                const activeCount = this.getActiveBusinessCount();
                if (activeCount >= maxConcurrentBusinesses) {
                    await this.logProgress(
                        `⏸️ Max concurrent businesses reached (${activeCount}/${maxConcurrentBusinesses}). Waiting...`,
                        'info'
                    );
                    await this.sleep(loopInterval);
                    continue;
                }

                // Step 5: Start the business
                await this.logProgress(`🚀 Starting business: ${topIdea.name}`, 'start', true);
                const startResult = await this.startBusiness({
                    description: `${topIdea.name}: ${topIdea.description || topIdea.recommendation}`,
                    industry: topIdea.industry,
                    targetMarket: topIdea.targetMarket,
                    budget: topIdea.estimatedStartupCost
                });

                if (startResult.success) {
                    this.empireState.businessesStarted.push({
                        id: startResult.business.id,
                        name: topIdea.name,
                        startedAt: new Date().toISOString()
                    });
                    this.empireState.cycleCount = cycleCount;
                    this.saveEmpireState();

                    await this.logProgress(
                        `✅ Business "${topIdea.name}" initialized!\n` +
                        `   Now running: ${activeCount + 1}/${maxConcurrentBusinesses}`,
                        'milestone',
                        true
                    );

                    // Execute the plan
                    await this.executePlan();
                }

            } catch (error) {
                await this.logProgress(`❌ Empire cycle error: ${error.message}`, 'error', true);
            }

            // Wait for next cycle
            await this.logProgress(`💤 Next cycle in ${loopInterval / 1000 / 60} minutes...`, 'info');
            await this.sleep(loopInterval);
        }

        return { success: true, message: 'Empire loop stopped', cycleCount };
    }

    /**
     * Stop the empire loop
     */
    stopEmpireLoop() {
        if (this.empireState) {
            this.empireState.isRunning = false;
            this.saveEmpireState();
        }
        this.logProgress('🛑 Empire loop stopped', 'empire_stop', true);
    }

    /**
     * Get count of active businesses
     */
    getActiveBusinessCount() {
        const businessesDir = path.join(this.dataDir, '../businesses');
        if (!fs.existsSync(businessesDir)) return 0;

        const analyses = fs.readdirSync(businessesDir)
            .filter(f => f.startsWith('analysis-') && f.endsWith('.json'));

        let activeCount = 0;
        for (const file of analyses) {
            const analysis = JSON.parse(fs.readFileSync(path.join(businessesDir, file), 'utf-8'));
            if (analysis.status !== 'completed' && analysis.status !== 'abandoned') {
                activeCount++;
            }
        }
        return activeCount;
    }

    /**
     * Save empire state
     */
    saveEmpireState() {
        const empirePath = path.join(this.dataDir, 'empire-state.json');
        fs.writeFileSync(empirePath, JSON.stringify(this.empireState, null, 2));
    }

    /**
     * Load empire state
     */
    loadEmpireState() {
        const empirePath = path.join(this.dataDir, 'empire-state.json');
        if (fs.existsSync(empirePath)) {
            this.empireState = JSON.parse(fs.readFileSync(empirePath, 'utf-8'));
        }
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Save current state
     */
    async saveState() {
        if (this.activeBusiness && this.db) {
            await this.db.saveBusiness(this.activeBusiness);
        }

        const statePath = path.join(this.dataDir, 'state.json');
        fs.writeFileSync(statePath, JSON.stringify({
            activeBusiness: this.activeBusiness,
            lastUpdated: new Date().toISOString()
        }, null, 2));
    }

    /**
     * Load saved state
     */
    loadState() {
        const statePath = path.join(this.dataDir, 'state.json');
        if (fs.existsSync(statePath)) {
            const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
            this.activeBusiness = state.activeBusiness;
        }
    }

    /**
     * Execute from orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'start':
                return this.startBusiness(task.data);
            case 'execute':
                return this.executePlan();
            case 'status':
                return this.getStatus();
            case 'approve':
                return this.approveDecision(task.data.id, task.data.notes);
            case 'reject':
                return this.rejectDecision(task.data.id, task.data.reason);
            case 'progress':
                return this.progressLog.slice(-(task.data?.limit || 20));
            case 'empire':
                return this.runEmpireLoop(task.data);
            case 'stop_empire':
                this.stopEmpireLoop();
                return { success: true };
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default CEOAgent;

