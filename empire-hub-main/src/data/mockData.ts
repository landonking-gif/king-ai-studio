import { TaskStatus } from "@/components/dashboard/TaskStatusCard";
import { ApprovalType } from "@/components/dashboard/ApprovalCard";

export const activeTasks = [
  {
    id: "1",
    name: "Market Research: AI Writing Tools",
    status: "running" as TaskStatus,
    module: "BusinessAnalyzer",
    progress: 67,
  },
  {
    id: "2",
    name: "Generate Landing Page Copy",
    status: "running" as TaskStatus,
    module: "ContentGenerator",
    progress: 45,
  },
  {
    id: "3",
    name: "SEO Optimization Pass",
    status: "pending" as TaskStatus,
    module: "SEOEngine",
  },
];

export const recentTasks = [
  {
    id: "4",
    name: "Deploy CloudSync Pro v2.1",
    status: "completed" as TaskStatus,
    module: "DeploymentAgent",
    startedAt: "2 hours ago",
  },
  {
    id: "5",
    name: "Customer Onboarding Flow",
    status: "completed" as TaskStatus,
    module: "UXOptimizer",
    startedAt: "4 hours ago",
  },
  {
    id: "6",
    name: "Database Migration",
    status: "failed" as TaskStatus,
    module: "InfraManager",
    startedAt: "5 hours ago",
  },
  {
    id: "7",
    name: "Payment Gateway Integration",
    status: "completed" as TaskStatus,
    module: "StripeConnector",
    startedAt: "Yesterday",
  },
];

export const pendingApprovals = [
  {
    id: "a1",
    title: "Legal Entity Formation",
    description: "Register CloudSync Pro LLC in Delaware. Estimated filing fees: $350. This will provide liability protection and tax benefits for the SaaS venture.",
    type: "legal" as ApprovalType,
    urgency: "high" as const,
    requestedAt: "10 minutes ago",
    module: "LegalAutopilot",
  },
  {
    id: "a2",
    title: "Cloud Infrastructure Budget",
    description: "Approve monthly AWS spending increase from $500 to $1,200 to handle projected traffic growth for Q1 2025.",
    type: "financial" as ApprovalType,
    urgency: "medium" as const,
    requestedAt: "1 hour ago",
    module: "PortfolioManager",
  },
  {
    id: "a3",
    title: "Strategic Pivot: Niche Expansion",
    description: "Expand CloudSync Pro to target healthcare sector. This requires HIPAA compliance work (~2 weeks) but opens $2B market opportunity.",
    type: "strategic" as ApprovalType,
    urgency: "low" as const,
    requestedAt: "3 hours ago",
    module: "StrategyManager",
  },
];

export const activities = [
  {
    id: "act1",
    message: "Started recursive evaluation loop on marketing strategy",
    type: "thinking" as const,
    timestamp: "Just now",
    module: "SelfEvaluator",
  },
  {
    id: "act2",
    message: "Successfully deployed landing page to production",
    type: "success" as const,
    timestamp: "2 min ago",
    module: "DeploymentAgent",
  },
  {
    id: "act3",
    message: "Generated 15 keyword-optimized blog post outlines",
    type: "action" as const,
    timestamp: "5 min ago",
    module: "SEOEngine",
  },
  {
    id: "act4",
    message: "Database migration failed: connection timeout",
    type: "error" as const,
    timestamp: "10 min ago",
    module: "InfraManager",
  },
  {
    id: "act5",
    message: "Analyzing competitor pricing models for CloudSync Pro",
    type: "business" as const,
    timestamp: "15 min ago",
    module: "BusinessAnalyzer",
  },
  {
    id: "act6",
    message: "Refactored authentication module for 40% performance gain",
    type: "code" as const,
    timestamp: "20 min ago",
    module: "SelfRefactorer",
  },
];

export const businesses = [
  {
    id: "b1",
    name: "CloudSync Pro",
    niche: "SaaS / Cloud Storage",
    status: "active" as const,
    revenue: 12500,
    revenueChange: 23,
    customers: 342,
    website: "cloudsyncpro.io",
    startedAt: "Oct 2024",
  },
  {
    id: "b2",
    name: "AIWriter Hub",
    niche: "AI Content Tools",
    status: "launching" as const,
    revenue: 0,
    revenueChange: 0,
    customers: 0,
    startedAt: "Dec 2024",
  },
  {
    id: "b3",
    name: "DataVault Analytics",
    niche: "Business Intelligence",
    status: "active" as const,
    revenue: 8200,
    revenueChange: -5,
    customers: 156,
    website: "datavault.ai",
    startedAt: "Aug 2024",
  },
  {
    id: "b4",
    name: "QuickInvoice",
    niche: "Fintech / Invoicing",
    status: "paused" as const,
    revenue: 2100,
    revenueChange: -12,
    customers: 89,
    website: "quickinvoice.co",
    startedAt: "Jun 2024",
  },
];

export const chatMessages = [
  {
    id: "m1",
    role: "ai" as const,
    content: "Good morning, Emperor. I've completed the overnight analysis of market opportunities. Three high-potential niches have been identified:\n\n1. **AI-Powered Resume Builders** - $4.2B market, 23% YoY growth\n2. **Remote Team Analytics** - $1.8B market, emerging demand\n3. **Micro-SaaS for Freelancers** - Low competition, high margins\n\nShall I initiate deep research on any of these?",
    thinking: "Analyzing market data from Statista, CB Insights, and proprietary scraping...\n\nEvaluating against portfolio synergy matrix:\n- Resume builders complement AIWriter Hub\n- Team analytics has infrastructure overlap with DataVault\n- Freelancer tools are new vertical but high ROI potential\n\nCross-referencing with competitor analysis... Complete.\n\nPreparing summary with confidence scores...",
    timestamp: "9:00 AM",
  },
  {
    id: "m2",
    role: "user" as const,
    content: "Focus on the Remote Team Analytics opportunity. What would the MVP look like?",
    timestamp: "9:02 AM",
  },
  {
    id: "m3",
    role: "ai" as const,
    content: "Excellent choice. Here's the MVP blueprint for **RemoteMetrics**:\n\n**Core Features:**\n• Team activity dashboard (keyboard/mouse metrics)\n• Productivity scoring with AI insights\n• Slack/Teams integration\n• Weekly automated reports\n\n**Tech Stack:**\n• Next.js frontend, Supabase backend\n• Electron desktop agent\n• OpenAI for insight generation\n\n**Timeline:** 6 weeks to beta\n**Estimated Cost:** $2,400 (primarily API costs)\n\nI can begin the development sprint immediately. Do you want me to proceed, or should I await approval for the infrastructure budget first?",
    thinking: "Retrieving template from SaaS blueprint library...\n\nAssessing tech stack compatibility with existing portfolio infrastructure... 87% overlap with CloudSync Pro.\n\nCalculating development timeline using historical velocity data from 23 previous launches...\n\nCost estimation based on:\n- Server costs: $400/mo projected\n- API usage: ~$200/mo at scale\n- One-time: domain, design assets ~$400\n\nRisk assessment: MEDIUM - Desktop agent requires code signing certificates.",
    timestamp: "9:03 AM",
  },
];
