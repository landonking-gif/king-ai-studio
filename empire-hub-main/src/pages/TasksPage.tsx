import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TaskStatusCard, TaskStatus } from "@/components/dashboard/TaskStatusCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activeTasks, recentTasks, activities } from "@/data/mockData";
import {
  Search,
  Filter,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

const allTasks = [
  ...activeTasks,
  ...recentTasks,
  {
    id: "8",
    name: "Competitor Analysis Report",
    status: "pending" as TaskStatus,
    module: "BusinessAnalyzer",
    startedAt: "Queued",
  },
  {
    id: "9",
    name: "Email Campaign Setup",
    status: "pending" as TaskStatus,
    module: "MarketingEngine",
    startedAt: "Queued",
  },
];

const statusCounts = {
  all: allTasks.length,
  running: allTasks.filter((t) => t.status === "running").length,
  pending: allTasks.filter((t) => t.status === "pending").length,
  completed: allTasks.filter((t) => t.status === "completed").length,
  failed: allTasks.filter((t) => t.status === "failed").length,
};

const TasksPage = () => {
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTasks = allTasks.filter((task) => {
    const matchesFilter = filter === "all" || task.status === filter;
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold gold-text">Task Command Center</h1>
            <p className="text-muted-foreground mt-1">
              Monitor and control all autonomous operations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause All
            </Button>
            <Button className="gap-2 bg-primary text-primary-foreground">
              <Play className="w-4 h-4" />
              Resume Queue
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status as TaskStatus | "all")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                filter === status
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "running" && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === "pending" && <Clock className="w-4 h-4" />}
              {status === "completed" && <CheckCircle className="w-4 h-4" />}
              {status === "failed" && <XCircle className="w-4 h-4" />}
              <span className="capitalize">{status}</span>
              <Badge variant="secondary" className="ml-1">
                {count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task List */}
          <div className="lg:col-span-2">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {filter === "all" ? "All Tasks" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Tasks`}
                </h3>
                <Button variant="ghost" size="sm" className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${
                      task.status === "running" ? "bg-primary/10" :
                      task.status === "completed" ? "bg-success/10" :
                      task.status === "failed" ? "bg-destructive/10" :
                      "bg-warning/10"
                    }`}>
                      {task.status === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                      {task.status === "pending" && <Clock className="w-4 h-4 text-warning" />}
                      {task.status === "completed" && <CheckCircle className="w-4 h-4 text-success" />}
                      {task.status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.name}</p>
                      <p className="text-sm text-muted-foreground">{task.module}</p>
                    </div>
                    {"progress" in task && task.progress !== undefined && (
                      <div className="w-24">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-right mt-1">
                          {task.progress}%
                        </p>
                      </div>
                    )}
                    {"startedAt" in task && (task as any).startedAt && (
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {(task as any).startedAt}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-5">
              <h3 className="text-lg font-semibold mb-4">Execution Log</h3>
              <ActivityFeed activities={activities} maxHeight="500px" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TasksPage;
