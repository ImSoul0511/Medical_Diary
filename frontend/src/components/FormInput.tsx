import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
};

export function FormInput({
  label,
  error,
  helperText,
  icon,
  className,
  id,
  ...props
}: FormInputProps) {
  const inputId = id ?? props.name ?? label;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-medium text-secondary">{label}</span>
      <span className="relative block">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mutedForeground">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            "h-10 w-full rounded-input border border-border bg-inputBackground px-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
            icon && "pl-10",
            error && "border-emergency focus:border-emergency focus:ring-emergency/20",
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
