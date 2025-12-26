import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ApprovalCard } from "@/components/dashboard/ApprovalCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { _FALLBACK, loadRemote } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  DollarSign,
  AlertTriangle,
  FileText,
  CheckCircle,
  History,
} from "lucide-react";

const approvalHistory = [
  {
    id: "h1",
    title: "Domain Registration: aiwriterhub.io",
    type: "financial",
    decision: "approved",
    decidedAt: "Yesterday",
    cost: "$15",
  },
  {
    id: "h2",
    title: "Terms of Service Update",
    type: "legal",
    decision: "approved",
    decidedAt: "2 days ago",
  },
  {
    id: "h3",
    title: "Aggressive Pricing Strategy",
    type: "strategic",
    decision: "rejected",
    decidedAt: "3 days ago",
  },
];

const ApprovalsPage = () => {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState(_FALLBACK.pendingApprovals);
  useEffect(() => {
    let mounted = true;
    loadRemote().then((d) => {
      if (!mounted) return;
      setApprovals(d.approvals || _FALLBACK.pendingApprovals);
    });
    return () => { mounted = false };
  }, []);
  const [filter, setFilter] = useState<string>("all");

  const handleApprove = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    toast({
      title: "Approved",
      description: "Task has been approved and queued for execution.",
    });
  };

  const handleReject = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    toast({
      title: "Rejected",
      description: "Task has been rejected and archived.",
      variant: "destructive",
    });
  };

  const filterCounts = {
    all: approvals.length,
    legal: approvals.filter((a) => a.type === "legal").length,
    financial: approvals.filter((a) => a.type === "financial").length,
    strategic: approvals.filter((a) => a.type === "strategic").length,
    technical: approvals.filter((a) => a.type === "technical").length,
  };

  const filteredApprovals = approvals.filter(
    (a) => filter === "all" || a.type === filter
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold gold-text">
              Approval Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Critical decisions requiring your authorization
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="py-2 px-4 border-warning/50 text-warning">
              {approvals.length} Pending
            </Badge>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(filterCounts).map(([type, count]) => {
            const icons: Record<string, React.ReactNode> = {
              all: null,
              legal: <Shield className="w-4 h-4" />,
              financial: <DollarSign className="w-4 h-4" />,
              strategic: <AlertTriangle className="w-4 h-4" />,
              technical: <FileText className="w-4 h-4" />,
            };
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  filter === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {icons[type]}
                <span className="capitalize">{type}</span>
                <Badge variant="secondary" className="ml-1">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Approvals */}
          <div className="lg:col-span-2 space-y-4">
            {filteredApprovals.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Clear</h3>
                <p className="text-muted-foreground">
                  No pending approvals. The empire runs smoothly.
                </p>
              </div>
            ) : (
              filteredApprovals.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </div>

          {/* History Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-5">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Decisions
              </h3>
              <div className="space-y-3">
                {approvalHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm">{item.title}</p>
                      <Badge
                        variant="outline"
                        className={
                          item.decision === "approved"
                            ? "border-success/50 text-success"
                            : "border-destructive/50 text-destructive"
                        }
                      >
                        {item.decision}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.decidedAt}</span>
                      {item.cost && <span>{item.cost}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-lg font-semibold">Approval Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Approved this week</span>
                  <span className="font-semibold text-success">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rejected this week</span>
                  <span className="font-semibold text-destructive">2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg. response time</span>
                  <span className="font-semibold">18 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApprovalsPage;
