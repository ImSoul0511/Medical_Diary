import { Bell, Menu, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { useNotifications } from "../hooks/useNotifications";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import type { Role } from "../types/auth";
import { Button } from "./Button";
import { Badge } from "./Badge";

type TopbarProps = {
  role: Role;
  title: string;
  description?: string;
};

export function Topbar({ role, title, description }: TopbarProps) {
  const { unreadCount } = useNotifications();
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const mockUser = useAuthStore((state) => state.mockUser);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Mở điều hướng"
          className="rounded-input p-2 text-mutedForeground hover:bg-muted lg:hidden"
          onClick={() => setMobileSidebarOpen(true)}
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-secondary lg:text-lg">{title}</h1>
          {description ? (
            <p className="hidden truncate text-xs text-mutedForeground sm:block">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {role === "user" ? (
          <Link
            className="inline-flex h-8 items-center justify-center gap-2 rounded-input border border-border bg-card px-3 text-xs font-medium text-secondary transition hover:bg-muted"
            to={ROUTES.emergency}
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">QR cấp cứu</span>
          </Link>
        ) : null}
        <button
          aria-label="Thông báo"
          className="relative rounded-input border border-border p-2 text-mutedForeground hover:bg-muted"
          type="button"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emergency px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>
        <div className="hidden items-center gap-2 pl-2 md:flex">
          <Badge tone={role === "admin" ? "admin" : role === "doctor" ? "success" : "info"}>
            {mockUser?.fullName ?? "UI mock"}
          </Badge>
        </div>
      </div>
    </header>
  );
}
