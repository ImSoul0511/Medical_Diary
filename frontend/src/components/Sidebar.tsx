/**
 * Tệp: frontend/src/components/Sidebar.tsx
 * Mục đích: Thành phần điều hướng bên (Sidebar) hiển thị link, thông tin user và nút đăng xuất.
 * Xuất khẩu: `Sidebar` - được `AppShell` sử dụng để cung cấp điều hướng chính.
 * Ghi chú: Đọc trạng thái auth và gọi logout thật khi user đăng xuất.
 */

import { useEffect } from "react";
import { Heart, LogOut, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  adminNavigation,
  doctorNavigation,
  patientNavigation,
} from "../constants/routes";
import { roleLabels } from "../constants/roles";
import { useAuthStore } from "../store/authStore";
import { useConsentStore } from "../store/consentStore";
import { useAdminStore } from "../store/adminStore";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { useUiStore } from "../store/uiStore";
import type { Role } from "../types/auth";
import { cn } from "../utils/cn";
import { Button } from "./Button";
import { Badge } from "./Badge";

type SidebarProps = {
  role: Role;
};

export function Sidebar({ role }: SidebarProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  
  const pendingRequests = useConsentStore((state) => state.pendingRequests);
  const loadAccessRequests = useConsentStore((state) => state.loadAccessRequests);
  
  const pendingDoctors = useAdminStore((state) => state.pendingDoctors);
  const loadPendingDoctors = useAdminStore((state) => state.loadPendingDoctors);

  const currentRoleTheme = role === "admin" ? "admin" : role === "doctor" ? "doctor" : "patient";
  const navigation =
    role === "admin" ? adminNavigation : role === "doctor" ? doctorNavigation : patientNavigation;

  useEffect(() => {
    if (role === "user") {
      void loadAccessRequests().catch(() => undefined);
    } else if (role === "admin") {
      void loadPendingDoctors().catch(() => undefined);
    }
  }, [role, loadAccessRequests, loadPendingDoctors]);

  const dynamicBadges: Record<string, number> = {
    [ROUTES.consent]: pendingRequests.length,
    [ROUTES.adminDoctorApproval]: pendingDoctors.length,
  };

  async function handleLogout() {
    await logout();
    navigate(ROUTES.login);
  }

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-white/5 bg-secondary/95 text-white backdrop-blur-glass-heavy",
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-white/5 px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-soft-sm",
              currentRoleTheme === "admin" && "bg-adminPrimary",
              currentRoleTheme === "doctor" && "bg-accent",
            )}
          >
            <Heart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide">Nhật ký Y tế</p>
            <p className="text-[11px] text-slate-300 font-medium">{roleLabels[role]}</p>
          </div>
        </div>
        <button
          aria-label="Đóng điều hướng"
          className="rounded-xl p-2 text-slate-300 hover:bg-white/8 lg:hidden transition-colors"
          onClick={() => setMobileSidebarOpen(false)}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Điều hướng chính">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.path}>
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-all duration-200 hover:bg-white/8 hover:text-white",
                    isActive &&
                      (currentRoleTheme === "admin"
                        ? "bg-adminPrimary text-white shadow-soft-sm"
                        : currentRoleTheme === "doctor"
                          ? "bg-accent text-white shadow-soft-sm"
                          : "bg-primary text-white shadow-soft-sm"),
                  )
                }
                onClick={() => setMobileSidebarOpen(false)}
                to={item.path}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                {dynamicBadges[item.path] ? <Badge tone="emergency">{dynamicBadges[item.path]}</Badge> : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/5 p-3">
        <Button
          className="w-full justify-start text-slate-300 hover:text-white"
          onClick={() => void handleLogout()}
          variant="ghost"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
