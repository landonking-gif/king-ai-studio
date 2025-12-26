import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Building2, Globe, Users } from "lucide-react";

type BusinessStatus = "active" | "launching" | "paused" | "archived";

interface Business {
  id: string;
  name: string;
  niche: string;
  status: BusinessStatus;
  revenue: number;
  revenueChange: number;
  customers: number;
  website?: string;
  startedAt: string;
}

interface BusinessCardProps {
  business: Business;
  onClick?: () => void;
}

const statusStyles = {
  active: "bg-success/20 text-success border-success/30",
  launching: "bg-primary/20 text-primary border-primary/30",
  paused: "bg-warning/20 text-warning border-warning/30",
  archived: "bg-muted text-muted-foreground border-muted",
};

export function BusinessCard({ business, onClick }: BusinessCardProps) {
  const isPositive = business.revenueChange >= 0;

  return (
    <div
      onClick={onClick}
      className="glass-card-hover p-5 cursor-pointer space-y-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">{business.name}</h4>
            <p className="text-sm text-muted-foreground">{business.niche}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("capitalize", statusStyles[business.status])}>
          {business.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Monthly Revenue</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              ${business.revenue.toLocaleString()}
            </span>
            <span
              className={cn(
                "flex items-center text-xs",
                isPositive ? "text-success" : "text-destructive"
              )}
            >
              {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {Math.abs(business.revenueChange)}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Customers</p>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-lg font-bold">{business.customers}</span>
          </div>
        </div>
      </div>

      {business.website && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span className="truncate">{business.website}</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Started {business.startedAt}
      </div>
    </div>
  );
}
