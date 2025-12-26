import { cn } from "@/lib/utils";
import {
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Brain,
  Code,
  Building2,
} from "lucide-react";

type ActivityType = "success" | "error" | "info" | "action" | "thinking" | "code" | "business";

interface Activity {
  id: string;
  message: string;
  type: ActivityType;
  timestamp: string;
  module?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  maxHeight?: string;
}

  const activityConfig = {
  success: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10" },
  action: { icon: Zap, color: "text-primary", bg: "bg-primary/10" },
  thinking: { icon: Brain, color: "text-purple-400", bg: "bg-purple-400/10" },
  code: { icon: Code, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  business: { icon: Building2, color: "text-amber-400", bg: "bg-amber-400/10" },
};

const defaultActivity = { icon: Info, color: "text-muted-foreground", bg: "bg-muted-foreground/10" };

export function ActivityFeed({ activities, maxHeight = "400px" }: ActivityFeedProps) {
  return (
    <div
      className="space-y-2 overflow-y-auto scrollbar-thin pr-2"
      style={{ maxHeight }}
    >
      {activities.map((activity, index) => {
        const config = (activityConfig as any)[activity.type] || defaultActivity;
        const Icon = config.icon;
        return (
          <div
            key={activity.id}
            className="flex gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={cn("p-1.5 rounded-md shrink-0", config.bg)}>
              <Icon className={cn("w-3.5 h-3.5", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">{activity.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {activity.timestamp}
                </span>
                {activity.module && (
                  <span className="text-xs text-primary/70">{activity.module}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
