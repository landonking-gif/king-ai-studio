import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TaskStatusCard } from "@/components/dashboard/TaskStatusCard";
import { ApprovalCard } from "@/components/dashboard/ApprovalCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TaskDistributionChart } from "@/components/dashboard/TaskDistributionChart";
import { _FALLBACK, loadRemote } from "@/data/mockData";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  Building2,
  DollarSign,
  Activity,
  CheckCircle,
  Clock,
} from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [activeTasksState, setActiveTasksState] = useState(_FALLBACK.activeTasks);
  const [recentTasksState, setRecentTasksState] = useState(_FALLBACK.recentTasks);
  const [pendingApprovalsState, setPendingApprovalsState] = useState(_FALLBACK.pendingApprovals);
  const [activitiesState, setActivitiesState] = useState(_FALLBACK.activities);

  useEffect(() => {
    let mounted = true;
    loadRemote().then((d) => {
      if (!mounted) return;
      setActiveTasksState(d.activeTasks || _FALLBACK.activeTasks);
      setRecentTasksState(d.recentTasks || _FALLBACK.recentTasks);
      setPendingApprovalsState(d.approvals || _FALLBACK.pendingApprovals);
      setActivitiesState(d.activities || _FALLBACK.activities);
    });
    return () => { mounted = false };
  }, []);

  const handleApprove = (id: string) => {
    toast({
      title: "Approved",
      description: "Task has been approved and queued for execution.",
    });
  };

  const handleReject = (id: string) => {
    toast({
      title: "Rejected",
      description: "Task has been rejected.",
      variant: "destructive",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gold-text">
              Empire Command Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, Emperor. Your autonomous operations are running smoothly.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/30">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-success">All Systems Operational</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active Businesses"
            value={5}
            change={25}
            changeLabel="this quarter"
            icon={<Building2 className="w-5 h-5" />}
          />
          <MetricCard
            title="Monthly Revenue"
            value="$10.6K"
            change={18}
            changeLabel="vs last month"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title="Tasks Completed"
            value={127}
            change={34}
            changeLabel="this week"
            icon={<CheckCircle className="w-5 h-5" />}
          />
          <MetricCard
            title="Pending Approvals"
            value={pendingApprovalsState.length}
            icon={<Clock className="w-5 h-5" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            <RevenueChart />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TaskStatusCard
                title="Active Tasks"
                tasks={activeTasksState}
                showProgress
              />
              <TaskDistributionChart />
            </div>
          </div>

          {/* Right Column - Activity & Approvals */}
          <div className="space-y-6">
            <div className="glass-card p-5">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Live Activity
              </h3>
              <ActivityFeed activities={activitiesState} maxHeight="300px" />
            </div>

            <div className="glass-card p-5">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Awaiting Your Decision
              </h3>
              <div className="space-y-4">
                {pendingApprovalsState.slice(0, 2).map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <TaskStatusCard title="Recent Task History" tasks={recentTasksState} />
      </div>
    </DashboardLayout>
  );
};

export default Index;
