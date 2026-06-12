import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger" | "success";
  confirmDisabled?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
};

export function Modal({
  open,
  title,
  description,
  children,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  confirmVariant = "primary",
  confirmDisabled = false,
  onConfirm,
  onClose,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 transition-all duration-300">
      <div className="w-full max-w-lg rounded-modal border border-border/60 bg-white shadow-soft-xl animate-scale-in overflow-hidden">
        <div className="flex items-start justify-between border-b border-border/40 p-6">
          <div>
            <h2 className="text-lg font-bold text-secondary tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-mutedForeground font-medium">{description}</p>
            ) : null}
          </div>
          <button
            aria-label="Đóng"
            className="rounded-xl p-2 text-mutedForeground hover:bg-muted/60 transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children ? <div className="p-6">{children}</div> : null}
        <div className="flex justify-end gap-2 border-t border-border/40 p-5 bg-white/40">
          <Button onClick={onClose} variant="outline">
            {cancelLabel}
          </Button>
          {onConfirm ? (
            <Button disabled={confirmDisabled} onClick={onConfirm} variant={confirmVariant}>
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
