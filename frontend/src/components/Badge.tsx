import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

type BadgeTone = "success" | "pending" | "emergency" | "info" | "muted" | "admin";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-successBg/80 text-green-800",
  pending: "bg-warningBg/80 text-orange-800",
  emergency: "bg-dangerBg/80 text-red-800",
  info: "bg-infoBg/80 text-blue-800",
  muted: "bg-muted/80 text-mutedForeground",
  admin: "bg-adminBackground/80 text-adminAccent",
};

export function Badge({ className, tone = "muted", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5 shadow-soft-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
