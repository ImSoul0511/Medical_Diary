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
  onConfirm,
  onClose,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-card border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-secondary">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-mutedForeground">{description}</p>
            ) : null}
          </div>
          <button
            aria-label="Đóng"
            className="rounded-input p-2 text-mutedForeground hover:bg-muted"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children ? <div className="p-5">{children}</div> : null}
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <Button onClick={onClose} variant="outline">
            {cancelLabel}
          </Button>
          {onConfirm ? (
            <Button onClick={onConfirm} variant={confirmVariant}>
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
