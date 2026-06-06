/**
 * Tệp: frontend/src/components/AppShell.tsx
 * Mục đích: Wrapper bố cục ứng dụng. Hiển thị `Topbar`, `Sidebar` và nội dung trang.
 * Xuất khẩu: `AppShell` - component dùng bởi các trang để cung cấp layout và theme đồng nhất.
 * Ghi chú: Bảo vệ layout cần đăng nhập và toast toàn cục.
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import type { Role } from "../types/auth";
import { cn } from "../utils/cn";

type AppShellProps = {
  role: Role;
  title: string;
  description?: string;
  children: ReactNode;
};

export function AppShell({ role, title, description, children }: AppShellProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const mobileSidebarOpen = useUiStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const setRoleTheme = useUiStore((state) => state.setRoleTheme);
  const toastMessage = useUiStore((state) => state.toastMessage);
  const clearToast = useUiStore((state) => state.clearToast);
  const navigate = useNavigate();

  useEffect(() => {
    setRoleTheme(role === "admin" ? "admin" : role === "doctor" ? "doctor" : "patient");
    if (isAuthenticated) return;

    if (!isHydrated) {
      void refreshSession().catch(() => undefined);
      return;
    }

    if (window.location.pathname !== ROUTES.login && window.location.pathname !== ROUTES.register) {
      navigate(ROUTES.login);
    }
  }, [isAuthenticated, isHydrated, refreshSession, role, setRoleTheme, navigate]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = window.setTimeout(clearToast, 2600);
    return () => window.clearTimeout(timeout);
  }, [clearToast, toastMessage]);

  const isAdmin = role === "admin";

  if (!isAuthenticated) return null;

  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", isAdmin && "bg-adminBackground")}>
      <div className="hidden h-full lg:block">
        <Sidebar role={role} />
      </div>
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            aria-label="Đóng lớp phủ"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileSidebarOpen(false)}
            type="button"
          />
          <div className="relative z-10">
            <Sidebar role={role} />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar description={description} role={role} title={title} />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:p-6">
          {children}
        </main>
      </div>
      {toastMessage ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-card border border-border bg-card px-4 py-3 text-sm text-secondary shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
