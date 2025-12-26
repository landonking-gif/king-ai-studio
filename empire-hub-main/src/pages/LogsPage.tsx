import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Brain,
} from "lucide-react";

const logEntries = [
  {
    id: "log1",
    timestamp: "2024-12-25 09:45:23",
    level: "info",
    module: "CEOAgent",
    message: "Starting daily empire management cycle",
    details: "Initiated autonomous operations with 4 active businesses",
  },
  {
    id: "log2",
    timestamp: "2024-12-25 09:45:25",
    level: "action",
    module: "BusinessAnalyzer",
    message: "Analyzing market opportunity: AI Writing Tools",
    details: "Cross-referencing 23 data sources for validation",
  },
  {
    id: "log3",
    timestamp: "2024-12-25 09:46:01",
    level: "thinking",
    module: "SelfEvaluator",
    message: "Running critique pass on marketing strategy",
    details: "Score: 78/100 - Recommending rewrite for clarity",
  },
  {
    id: "log4",
    timestamp: "2024-12-25 09:47:15",
    level: "success",
    module: "ContentGenerator",
    message: "Generated 5 blog post drafts for CloudSync Pro",
    details: "Average quality score: 92/100",
  },
  {
    id: "log5",
    timestamp: "2024-12-25 09:48:30",
    level: "error",
    module: "InfraManager",
    message: "Database migration failed",
    details: "Connection timeout after 30s. Retrying in 60s...",
  },
  {
    id: "log6",
    timestamp: "2024-12-25 09:50:00",
    level: "info",
    module: "ModelRouter",
    message: "Switched to Ollama for batch processing",
    details: "Cost optimization: $0.00 vs $2.30 (cloud)",
  },
  {
    id: "log7",
    timestamp: "2024-12-25 09:51:45",
    level: "action",
    module: "SEOEngine",
    message: "Optimizing meta tags for landing pages",
    details: "Processing 12 pages across 3 domains",
  },
  {
    id: "log8",
    timestamp: "2024-12-25 09:53:20",
    level: "success",
    module: "DeploymentAgent",
    message: "Deployed CloudSync Pro v2.1.3 to production",
    details: "Zero-downtime deployment completed",
  },
];

const levelConfig = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10" },
  success: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  action: { icon: Zap, color: "text-primary", bg: "bg-primary/10" },
  thinking: { icon: Brain, color: "text-purple-400", bg: "bg-purple-400/10" },
};

const LogsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const filteredLogs = logEntries.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold gold-text">
              Audit Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete record of all AI decisions and actions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          <div className="flex gap-2">
            {["all", "info", "success", "error", "action", "thinking"].map(
              (level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={`px-4 py-2 rounded-lg border transition-all capitalize ${
                    levelFilter === level
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {level}
                </button>
              )
            )}
          </div>
        </div>

        {/* Log Entries */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Timestamp
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Level
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Module
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const config = levelConfig[log.level as keyof typeof levelConfig];
                  const Icon = config.icon;
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                    >
                      <td className="p-4 text-sm font-mono text-muted-foreground whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={`capitalize ${config.bg} ${config.color} border-transparent`}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {log.level}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-primary">{log.module}</td>
                      <td className="p-4">
                        <p className="text-sm font-medium">{log.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.details}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(levelConfig).map(([level, config]) => {
            const count = logEntries.filter((l) => l.level === level).length;
            const Icon = config.icon;
            return (
              <div
                key={level}
                className={`p-4 rounded-lg ${config.bg} border border-transparent`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-sm capitalize ${config.color}`}>
                    {level}
                  </span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LogsPage;
