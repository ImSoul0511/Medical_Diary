/**
 * Tệp: frontend/src/app/App.tsx
 * Mục đích: Thành phần gốc của ứng dụng, kết hợp providers và router.
 * Xuất khẩu: `App` - được mount bởi `main.tsx` để khởi động SPA.
 */

import { AppRouter } from "./router";
import { Providers } from "./providers";

export function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
