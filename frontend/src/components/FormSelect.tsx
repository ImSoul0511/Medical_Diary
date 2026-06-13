import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";

type Option = {
  value: string;
  label: string;
};

type FormSelectProps = {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  labelClassName?: string;
};

export function FormSelect({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  placeholder = "Chọn...",
  className,
  id,
  disabled,
  labelClassName,
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectId = id ?? label;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative block" ref={containerRef} id={selectId}>
      <span className={cn("mb-1.5 block text-sm font-medium text-secondary", labelClassName)}>{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-input border border-border/50 bg-white px-4 text-sm text-secondary outline-none transition-all duration-200 shadow-soft-sm focus:border-primary/40 focus:ring-4 focus:ring-primary/10 focus:shadow-soft disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed",
          error && "border-emergency focus:border-emergency focus:ring-4 focus:ring-emergency/10",
          className
        )}
      >
        <span className={cn(!selectedOption && "text-mutedForeground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-mutedForeground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-card border border-border bg-white shadow-soft-lg animate-scale-in">
          <ul className="max-h-[160px] overflow-y-auto py-1">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-4 py-2.5 text-left text-sm text-secondary hover:bg-slate-100/60 transition-colors",
                    option.value === value && "bg-primary/8 font-semibold text-primary"
                  )}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error ? <span className="mt-1 block text-xs text-emergency">{error}</span> : null}
      {!error && helperText ? (
        <span className="mt-1 block text-xs text-mutedForeground">{helperText}</span>
      ) : null}
    </div>
  );
}
