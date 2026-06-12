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
  primary:
    "bg-gradient-to-r from-primary to-primaryDark text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 focus-visible:ring-primary",
  secondary:
    "bg-secondary text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 focus-visible:ring-secondary",
  outline:
    "border border-border/60 bg-white/60 backdrop-blur-sm text-secondary shadow-soft-sm hover:bg-white hover:shadow-soft focus-visible:ring-primary",
  ghost:
    "bg-transparent text-secondary hover:bg-muted/60 focus-visible:ring-primary",
  danger:
    "bg-gradient-to-r from-emergency to-red-600 text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 focus-visible:ring-emergency",
  success:
    "bg-gradient-to-r from-success to-green-600 text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 focus-visible:ring-success",
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
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-button font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none",
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
