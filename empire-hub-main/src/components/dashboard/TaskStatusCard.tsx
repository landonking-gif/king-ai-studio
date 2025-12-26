import { cn } from "@/lib/utils";
import { Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

export type TaskStatus = "running" | "completed" | "failed" | "pending";

interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  module?: string;
  startedAt?: string;
  progress?: number;
}

interface TaskStatusCardProps {
  tasks: Task[];
  title: string;
  showProgress?: boolean;
}

const statusConfig = {
  running: {
    icon: Loader2,
    color: "text-primary",
    bg: "bg-primary/10",
    label: "Running",
    animate: true,
  },
  completed: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    label: "Completed",
    animate: false,
  },
  failed: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Failed",
    animate: false,
  },
  pending: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Pending",
    animate: false,
  },
};

const defaultStatus = { icon: Clock, color: "text-muted-foreground", bg: "bg-muted-foreground/10", animate: false };

export function TaskStatusCard({ tasks, title, showProgress }: TaskStatusCardProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {title}
        <span className="text-sm font-normal text-muted-foreground">
          ({tasks.length})
        </span>
      </h3>
      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            No tasks to display
          </p>
        ) : (
          tasks.map((task) => {
            const config = (statusConfig as any)[task.status] || defaultStatus;
            const Icon = config.icon;
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 animate-slide-up"
              >
                <div className={cn("p-2 rounded-lg", config.bg)}>
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      config.color,
                      config.animate && "animate-spin"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task.name}</p>
                  {task.module && (
                    <p className="text-xs text-muted-foreground">{task.module}</p>
                  )}
                </div>
                {showProgress && task.progress !== undefined && (
                  <div className="w-20">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      {task.progress}%
                    </p>
                  </div>
                )}
                {task.startedAt && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {task.startedAt}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
