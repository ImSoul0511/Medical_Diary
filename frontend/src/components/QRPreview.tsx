import { buildMockQrCells } from "../utils/qr";
import { cn } from "../utils/cn";

type QRPreviewProps = {
  token: string;
  label?: string;
  compact?: boolean;
};

export function QRPreview({ token, label = "QR cấp cứu", compact = false }: QRPreviewProps) {
  const cells = buildMockQrCells(token);

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center rounded-card border border-border bg-white p-4 shadow-card",
        compact && "p-3",
      )}
    >
      <div
        aria-label={label}
        className={cn(
          "grid grid-cols-[repeat(13,minmax(0,1fr))] gap-0.5 rounded-input bg-white p-2",
          compact ? "h-28 w-28" : "h-40 w-40",
        )}
        role="img"
      >
        {cells.map((active, index) => (
          <span
            className={cn("rounded-[1px]", active ? "bg-secondary" : "bg-slate-100")}
            key={`${token}-${index}`}
          />
        ))}
      </div>
      <span className="mt-2 text-xs font-medium text-mutedForeground">{label}</span>
    </div>
  );
}
