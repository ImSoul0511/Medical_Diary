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
  primary: "bg-primary/10 text-primary",
  accent: "bg-teal-50 text-accent",
  danger: "bg-dangerBg text-emergency",
  success: "bg-successBg text-success",
  warning: "bg-warningBg text-warning",
  admin: "bg-adminBackground text-adminPrimary",
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
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-semibold text-secondary">{value}</span>
            {unit ? <span className="text-xs text-mutedForeground">{unit}</span> : null}
          </div>
        </div>
        <div className={cn("rounded-card p-2", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-mutedForeground">
        <TrendIcon className="h-3.5 w-3.5" />
        <span>So với kỳ gần nhất</span>
      </div>
    </Card>
  );
}
