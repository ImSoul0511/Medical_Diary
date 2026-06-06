/**
 * Tệp: frontend/src/components/Topbar.tsx
 * Mục đích: Thanh điều hướng trên cùng chứa các hành động nhanh (QR, thông báo) và badge user.
 * Xuất khẩu: `Topbar` - được `AppShell` dùng để hiển thị tiêu đề trang và các link nhanh.
 */

import { Bell, Menu, QrCode, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { roleLabels } from "../constants/roles";
import { useNotifications } from "../hooks/useNotifications";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { useEmergencyStore } from "../store/emergencyStore";
import { QRPreview } from "./QRPreview";
import { formatDate } from "../utils/date";
import type { Role } from "../types/auth";
import { Badge } from "./Badge";

type TopbarProps = {
  role: Role;
  title: string;
  description?: string;
};

export function Topbar({ role, title, description }: TopbarProps) {
  const { unreadCount, items, markAsRead, markAllLocalRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeQrIndex, setActiveQrIndex] = useState(0);
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const currentUser = useAuthStore((state) => state.currentUser);

  const tokens = useEmergencyStore((state) => state.tokens);
  const loadTokens = useEmergencyStore((state) => state.loadTokens);

  useEffect(() => {
    if (role === "user") {
      void loadTokens().catch(() => undefined);
    }
  }, [role, loadTokens]);

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
          <div className="relative">
            <button
              aria-label="QR cấp cứu"
              className="inline-flex h-8 items-center justify-center gap-2 rounded-input border border-border bg-card px-3 text-xs font-medium text-secondary transition hover:bg-muted"
              type="button"
              onClick={() => {
                setQrOpen((v) => !v);
                setActiveQrIndex(0);
              }}
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">QR cấp cứu</span>
            </button>

            {qrOpen ? (
              <div className="absolute right-0 mt-2 w-72 rounded-card border border-border bg-card p-4 shadow-lg z-50">
                <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                  <strong className="text-sm text-secondary">Mã QR cấp cứu</strong>
                  <button
                    className="text-xs text-primary hover:underline font-medium"
                    onClick={() => {
                      setQrOpen(false);
                    }}
                    type="button"
                  >
                    Đóng
                  </button>
                </div>
                {(() => {
                  const activeTokens = tokens.filter((t) => !t.isExpired);
                  if (activeTokens.length === 0) {
                    return (
                      <div className="text-center py-4">
                        <p className="text-xs text-mutedForeground mb-3">Chưa có mã QR hoạt động</p>
                        <Link
                          to={ROUTES.privacy}
                          className="inline-flex h-8 items-center justify-center rounded-input bg-primary px-3 text-xs font-medium text-white transition hover:bg-primaryDark"
                          onClick={() => setQrOpen(false)}
                        >
                          Tạo mã QR mới
                        </Link>
                      </div>
                    );
                  }

                  const safeIndex = Math.min(activeQrIndex, activeTokens.length - 1);
                  const currentToken = activeTokens[safeIndex];

                  return (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative p-2 bg-white rounded border border-border">
                        <QRPreview token={currentToken.token} size={150} />
                      </div>
                      
                      {activeTokens.length > 1 ? (
                        <div className="flex items-center justify-between w-full mt-1">
                          <button
                            type="button"
                            className="p-1 rounded border border-border hover:bg-muted text-secondary"
                            onClick={() => {
                              setActiveQrIndex((prev) => (prev - 1 + activeTokens.length) % activeTokens.length);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-xs font-semibold text-secondary">
                            QR {safeIndex + 1} / {activeTokens.length}
                          </span>
                          <button
                            type="button"
                            className="p-1 rounded border border-border hover:bg-muted text-secondary"
                            onClick={() => {
                              setActiveQrIndex((prev) => (prev + 1) % activeTokens.length);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}

                      <div className="w-full text-center space-y-1 mt-2 text-[10px] text-mutedForeground">
                        <p className="font-medium text-secondary truncate">
                          Mã: {currentToken.token.substring(0, 12)}...
                        </p>
                        <p>
                          Hạn dùng: {currentToken.expiresAt ? formatDate(currentToken.expiresAt) : "Vĩnh viễn"}
                        </p>
                        <div className="pt-2 flex flex-wrap gap-1 justify-center">
                          {currentToken.showBloodType && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px]">Nhóm máu</span>}
                          {currentToken.showAllergies && <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[9px]">Dị ứng</span>}
                          {currentToken.showEmergencyContact && <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[9px]">Liên hệ</span>}
                        </div>
                      </div>

                      <Link
                        to={ROUTES.privacy}
                        className="mt-2 w-full text-center text-xs text-primary hover:underline font-semibold"
                        onClick={() => setQrOpen(false)}
                      >
                        Quản lý tất cả QR
                      </Link>
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="relative">
          <button
            aria-label="Thông báo"
            className="relative rounded-input border border-border p-2 text-mutedForeground hover:bg-muted"
            type="button"
            onClick={() => setOpen((v) => !v)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emergency px-1 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 mt-2 w-80 rounded-card border border-border bg-card p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <strong className="text-sm">Thông báo</strong>
                <button className="text-xs text-mutedForeground" onClick={() => { markAllLocalRead(); }} type="button">Đánh dấu tất cả</button>
              </div>
              <ul className="max-h-64 overflow-auto">
                {items.length === 0 ? <li className="text-sm text-mutedForeground">Không có thông báo</li> : null}
                {items.map((it) => (
                  <li key={it.id} className="mb-2 flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${!it.isRead ? "font-semibold" : "text-mutedForeground"}`}>{it.title}</p>
                        {!it.isRead ? (
                          <button className="text-xs text-mutedForeground" onClick={() => { void markAsRead(it.id); }} type="button">Đánh dấu đã đọc</button>
                        ) : null}
                      </div>
                      <p className="text-xs text-mutedForeground">{it.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="hidden items-center gap-2 pl-2 md:flex">
          <Badge tone={role === "admin" ? "admin" : role === "doctor" ? "success" : "info"}>
            {currentUser?.fullName ?? roleLabels[role]}
          </Badge>
        </div>
      </div>
    </header>
  );
}
