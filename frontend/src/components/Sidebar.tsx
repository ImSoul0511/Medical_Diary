/**
 * Tệp: frontend/src/components/Sidebar.tsx
 * Mục đích: Thành phần điều hướng bên (Sidebar) hiển thị link, thông tin user và nút đăng xuất.
 * Xuất khẩu: `Sidebar` - được `AppShell` sử dụng để cung cấp điều hướng chính.
 * Ghi chú: Đọc trạng thái auth (`mockUser`) và gọi `logoutMock()` khi user đăng xuất.
 */

import { Heart, LogOut, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  adminNavigation,
  doctorNavigation,
  patientNavigation,
} from "../constants/routes";
import { roleLabels } from "../constants/roles";
import { useAuthStore } from "../store/authStore";
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
  const mockUser = useAuthStore((state) => state.mockUser);
  const logoutMock = useAuthStore((state) => state.logoutMock);
  const navigate = useNavigate();
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const currentRoleTheme = role === "admin" ? "admin" : role === "doctor" ? "doctor" : "patient";
  const navigation =
    role === "admin" ? adminNavigation : role === "doctor" ? doctorNavigation : patientNavigation;

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-slate-700 bg-secondary text-white",
        currentRoleTheme === "admin" && "border-slate-700",
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-slate-700 px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary",
              currentRoleTheme === "admin" && "bg-adminPrimary",
              currentRoleTheme === "doctor" && "bg-accent",
            )}
          >
            <Heart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Nhật ký Y tế</p>
            <p className="text-xs text-slate-300">{roleLabels[role]}</p>
          </div>
        </div>
        <button
          aria-label="Đóng điều hướng"
          className="rounded-input p-2 text-slate-300 hover:bg-slate-800 lg:hidden"
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
                    "flex items-center gap-3 rounded-card px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white",
                    isActive &&
                      (currentRoleTheme === "admin"
                        ? "bg-adminPrimary text-white"
                        : currentRoleTheme === "doctor"
                          ? "bg-accent text-white"
                          : "bg-primary text-white"),
                  )
                }
                onClick={() => setMobileSidebarOpen(false)}
                to={item.path}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge ? <Badge tone="emergency">{item.badge}</Badge> : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-700 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-card bg-slate-800 p-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold",
              currentRoleTheme === "admin" && "bg-adminPrimary",
              currentRoleTheme === "doctor" && "bg-accent",
            )}
          >
            {mockUser?.initials ?? "MD"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{mockUser?.fullName ?? "Khách"}</p>
            <p className="truncate text-[11px] text-slate-400">{mockUser?.subtitle ?? "UI mock"}</p>
          </div>
        </div>
        <Button
          className="w-full justify-start text-slate-300"
          onClick={() => {
            logoutMock();
            navigate(ROUTES.login);
          }}
          variant="ghost"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
