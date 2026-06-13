import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  labelClassName?: string;
};

export function FormInput({
  label,
  error,
  helperText,
  icon,
  className,
  id,
  labelClassName,
  ...props
}: FormInputProps) {
  const inputId = id ?? props.name ?? label;

  return (
    <label className="block" htmlFor={inputId}>
      <span className={cn("mb-1.5 block text-sm font-medium text-secondary", labelClassName)}>{label}</span>
      <span className="relative block">
        {icon ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mutedForeground transition-colors">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            "h-11 w-full rounded-input border border-border/50 bg-white disabled:bg-slate-100 disabled:opacity-75 disabled:cursor-not-allowed px-4 text-sm text-secondary outline-none transition-all duration-200 shadow-soft-sm focus:border-primary/40 focus:ring-4 focus:ring-primary/10 focus:shadow-soft",
            icon && "pl-11",
            error && "border-emergency focus:border-emergency focus:ring-4 focus:ring-emergency/10",
            className,
          )}
          {...props}
        />
      </span>
      {error ? <span className="mt-1 block text-xs text-emergency">{error}</span> : null}
      {!error && helperText ? (
        <span className="mt-1 block text-xs text-mutedForeground">{helperText}</span>
      ) : null}
    </label>
  );
}
