import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildMockQrCells } from "../utils/qr";
import { cn } from "../utils/cn";

type QRPreviewProps = {
  token: string;
  label?: string;
  compact?: boolean;
  size?: number;
};

export function QRPreview({
  token,
  label = "QR c\u1ea5p c\u1ee9u",
  compact = false,
  size,
}: QRPreviewProps) {
  const isMock = ["privacy-settings", "patient-dashboard", "demo-token"].includes(token);
  const dimension = size ?? (compact ? 112 : 160);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isMock) {
      setQrDataUrl(null);
      return undefined;
    }

    let cancelled = false;
    setQrDataUrl(null);

    void QRCode.toDataURL(`${window.location.origin}/cap-cuu/${token}`, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: dimension,
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [dimension, isMock, token]);

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center rounded-card border border-border bg-white p-4 shadow-card",
        compact && "p-3",
      )}
    >
      {isMock || !qrDataUrl ? (
        <div
          aria-label={label}
          className={cn(
            "grid grid-cols-[repeat(13,minmax(0,1fr))] gap-0.5 rounded-input bg-white p-2",
            compact ? "h-28 w-28" : "h-40 w-40",
          )}
          role="img"
          style={{ height: dimension, width: dimension }}
        >
          {buildMockQrCells(token).map((active, index) => (
            <span
              className={cn("rounded-[1px]", active ? "bg-secondary" : "bg-slate-100")}
              key={`${token}-${index}`}
            />
          ))}
        </div>
      ) : (
        <img
          alt={label}
          className={cn(
            "rounded-input border border-border bg-white p-2 object-contain",
            compact ? "h-28 w-28" : "h-40 w-40",
          )}
          src={qrDataUrl}
          style={{ height: dimension, width: dimension }}
        />
      )}
      <span className="mt-2 text-xs font-medium text-mutedForeground">{label}</span>
    </div>
  );
}
