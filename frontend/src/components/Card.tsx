import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  tone?: "default" | "info" | "success" | "danger" | "warning" | "admin";
  children: ReactNode;
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const toneClasses = {
  default: "border-border/50 bg-white",
  info: "border-blue-200/40 bg-blue-50/90",
  success: "border-green-200/40 bg-green-50/90",
  danger: "border-red-200/40 bg-red-50/90",
  warning: "border-amber-200/40 bg-amber-50/90",
  admin: "border-sky-200/40 bg-sky-50/90",
};

export function Card({
  className,
  padding = "md",
  interactive = false,
  tone = "default",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border shadow-soft transition-all duration-300",
        toneClasses[tone],
        paddingClasses[padding],
        interactive && "hover:-translate-y-1 hover:shadow-card-hover cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
