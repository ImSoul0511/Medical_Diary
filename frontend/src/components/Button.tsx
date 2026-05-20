import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primaryDark focus-visible:ring-primary",
  secondary: "bg-secondary text-white hover:bg-slate-800 focus-visible:ring-secondary",
  outline:
    "border border-border bg-card text-secondary hover:bg-muted focus-visible:ring-primary",
  ghost: "bg-transparent text-secondary hover:bg-muted focus-visible:ring-primary",
  danger: "bg-emergency text-white hover:bg-red-700 focus-visible:ring-emergency",
  success: "bg-success text-white hover:bg-green-700 focus-visible:ring-success",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-10 w-10 p-0",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-input font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      type={type}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
