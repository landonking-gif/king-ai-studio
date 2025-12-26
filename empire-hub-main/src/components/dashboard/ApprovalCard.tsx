import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, DollarSign, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type ApprovalType = "legal" | "financial" | "strategic" | "technical";

interface Approval {
  id: string;
  title: string;
  description: string;
  type: ApprovalType;
  urgency: "low" | "medium" | "high";
  requestedAt: string;
  module: string;
}

interface ApprovalCardProps {
  approval: Approval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const typeConfig = {
  legal: { icon: Shield, color: "bg-blue-500/20 text-blue-400" },
  financial: { icon: DollarSign, color: "bg-green-500/20 text-green-400" },
  strategic: { icon: AlertTriangle, color: "bg-amber-500/20 text-amber-400" },
  technical: { icon: FileText, color: "bg-purple-500/20 text-purple-400" },
};

const defaultType = { icon: FileText, color: "bg-secondary/20 text-muted-foreground" };

const urgencyColors = {
  low: "border-muted-foreground/30 text-muted-foreground",
  medium: "border-warning/50 text-warning",
  high: "border-destructive/50 text-destructive",
};

export function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
  const cfg = (typeConfig as any)[approval.type] || defaultType;
  const TypeIcon = cfg.icon;

  return (
    <div className="glass-card-hover p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", cfg.color)}>
            <TypeIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold">{approval.title}</h4>
            <p className="text-sm text-muted-foreground">{approval.module}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("capitalize", urgencyColors[approval.urgency])}
        >
          {approval.urgency}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {approval.description}
      </p>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          Requested {approval.requestedAt}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => onReject(approval.id)}
          >
            Reject
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onApprove(approval.id)}
          >
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
