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
  default: "border-border bg-card",
  info: "border-blue-100 bg-infoBg",
  success: "border-green-100 bg-successBg",
  danger: "border-red-100 bg-dangerBg",
  warning: "border-amber-100 bg-warningBg",
  admin: "border-sky-200 bg-white",
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
        "rounded-card border shadow-card",
        toneClasses[tone],
        paddingClasses[padding],
        interactive && "transition hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
