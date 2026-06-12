import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card } from "./Card";
import { cn } from "../utils/cn";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  tone?: "primary" | "accent" | "danger" | "success" | "warning" | "admin";
};

const toneClasses = {
  primary: "bg-gradient-to-br from-primary/15 to-primary/5 text-primary",
  accent: "bg-gradient-to-br from-accent/15 to-accent/5 text-accent",
  danger: "bg-gradient-to-br from-emergency/15 to-emergency/5 text-emergency",
  success: "bg-gradient-to-br from-success/15 to-success/5 text-success",
  warning: "bg-gradient-to-br from-warning/15 to-warning/5 text-warning",
  admin: "bg-gradient-to-br from-adminPrimary/15 to-adminPrimary/5 text-adminPrimary",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  trend = "stable",
  tone = "primary",
}: StatCardProps) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : ArrowRight;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-mutedForeground">{label}</p>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-secondary tracking-tight">{value}</span>
            {unit ? <span className="text-xs text-mutedForeground font-medium">{unit}</span> : null}
          </div>
        </div>
        <div className={cn("rounded-2xl p-2.5 shadow-soft-sm", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-1 text-[11px] font-medium text-mutedForeground">
        <TrendIcon className="h-3.5 w-3.5" />
        <span>So với kỳ gần nhất</span>
      </div>
    </Card>
  );
}
