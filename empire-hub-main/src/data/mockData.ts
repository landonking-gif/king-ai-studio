import { TaskStatus } from "@/components/dashboard/TaskStatusCard";
import { ApprovalType } from "@/components/dashboard/ApprovalCard";

// Fallback static data (keeps UI functional if backend is unavailable)
export const _FALLBACK = {
  activeTasks: [
    { id: "1", name: "Market Research: AI Writing Tools", status: "running" as TaskStatus, module: "BusinessAnalyzer", progress: 67 },
    { id: "2", name: "Generate Landing Page Copy", status: "running" as TaskStatus, module: "ContentGenerator", progress: 45 },
    { id: "3", name: "SEO Optimization Pass", status: "pending" as TaskStatus, module: "SEOEngine" },
  ],
  recentTasks: [
    { id: "4", name: "Deploy CloudSync Pro v2.1", status: "completed" as TaskStatus, module: "DeploymentAgent", startedAt: "2 hours ago" },
    { id: "5", name: "Customer Onboarding Flow", status: "completed" as TaskStatus, module: "UXOptimizer", startedAt: "4 hours ago" },
    { id: "6", name: "Database Migration", status: "failed" as TaskStatus, module: "InfraManager", startedAt: "5 hours ago" },
    { id: "7", name: "Payment Gateway Integration", status: "completed" as TaskStatus, module: "StripeConnector", startedAt: "Yesterday" },
  ],
  pendingApprovals: [
    { id: "a1", title: "Legal Entity Formation", description: "Register CloudSync Pro LLC...", type: "legal" as ApprovalType, urgency: "high", requestedAt: "10 minutes ago", module: "LegalAutopilot" },
  ],
  activities: [],
  businesses: [],
  chatMessages: [],
};

// The build can't rely on top-level await, so we read any preloaded data
// injected into `window.__EMPIRE_REMOTE__` by `index.html`. If not present,
// fall back to static sample data above.
const remote = (typeof window !== 'undefined' && (window).__EMPIRE_REMOTE__) || {};

export const activeTasks = (remote.activeTasks) || _FALLBACK.activeTasks;
export const recentTasks = (remote.recentTasks) || _FALLBACK.recentTasks;
export const pendingApprovals = (remote.approvals) || _FALLBACK.pendingApprovals;
export const activities = (remote.activities) || _FALLBACK.activities;
export const businesses = (remote.businesses) || _FALLBACK.businesses;
export const chatMessages = (remote.chat || remote.chatMessages) || _FALLBACK.chatMessages;

