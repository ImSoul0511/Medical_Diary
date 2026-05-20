import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

type BadgeTone = "success" | "pending" | "emergency" | "info" | "muted" | "admin";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-successBg text-green-800",
  pending: "bg-warningBg text-orange-800",
  emergency: "bg-dangerBg text-red-800",
  info: "bg-infoBg text-blue-800",
  muted: "bg-muted text-mutedForeground",
  admin: "bg-adminBackground text-adminAccent",
};

export function Badge({ className, tone = "muted", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
