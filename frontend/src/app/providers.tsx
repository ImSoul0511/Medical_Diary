/**
 * Tệp: frontend/src/app/providers.tsx
 * Mục đích: Wrapper cho các provider ở cấp ứng dụng (Router, theme, context, ...).
 * Xuất khẩu: `Providers` - bọc cây ứng dụng với React Router và các provider toàn cục khác.
 * Ghi chú: Thêm provider khác (theme, state) tại đây nếu cần.
 */
import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
