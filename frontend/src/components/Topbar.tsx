/**
 * Tệp: frontend/src/components/Topbar.tsx
 * Mục đích: Thanh điều hướng trên cùng chứa các hành động nhanh (QR, thông báo) và badge user.
 * Xuất khẩu: `Topbar` - được `AppShell` dùng để hiển thị tiêu đề trang và các link nhanh.
 */

import { Bell, Menu, QrCode, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const scopeMap: Record<string, string> = {
  blood_type: "Nhóm máu",
  allergies: "Dị ứng",
  emergency_contact: "Liên hệ khẩn cấp",
  medical_records: "Hồ sơ bệnh án",
  prescriptions: "Đơn thuốc",
  diaries: "Nhật ký triệu chứng",
  heart_rate: "Nhịp tim",
  step_count: "Bước chân",
  respiratory_rate: "Nhịp thở",
  manual_health_records: "Chỉ số nhập tay",
  patient_documents: "Tài liệu y tế cá nhân",
};

function translateNotification(title: string, message: string) {
  let translatedTitle = title;
  if (title === "Yeu cau truy cap moi") {
    translatedTitle = "Yêu cầu truy cập mới";
  }

  let translatedMessage = message;

  const match = message.match(/^Bac si (.*) muon truy cap ho so cua ban\. Pham vi: (.*)\.$/);
  if (match) {
    const doctorName = match[1];
    const scopesStr = match[2];
    
    const translatedScopes = scopesStr
      .split(", ")
      .map(s => {
        const cleanScope = s.trim();
        return scopeMap[cleanScope] || cleanScope;
      })
      .join(", ");

    translatedMessage = `Bác sĩ ${doctorName} muốn truy cập hồ sơ của bạn. Phạm vi: ${translatedScopes}.`;
  } else {
    Object.entries(scopeMap).forEach(([enScope, viScope]) => {
      translatedMessage = translatedMessage.replace(new RegExp(enScope, "g"), viScope);
    });
    translatedMessage = translatedMessage
      .replace("Bac si", "Bác sĩ")
      .replace("muon truy cap ho so cua ban", "muốn truy cập hồ sơ của bạn")
      .replace("Pham vi", "Phạm vi");
  }

  return { title: translatedTitle, message: translatedMessage };
}

type TopbarProps = {
  role: Role;
  title: string;
  description?: string;
};

export function Topbar({ role, title, description }: TopbarProps) {
  const { unreadCount, items, markAsRead, markAllLocalRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (it: any) => {
    if (!it.isRead) {
      void markAsRead(it.id);
    }
    setOpen(false);

    const type = it.type || "";
    const title = (it.title || "").toLowerCase();
    const msg = (it.message || "").toLowerCase();

    if (
      title.includes("duyệt") ||
      msg.includes("duyệt") ||
      title.includes("xác minh") ||
      msg.includes("xác minh") ||
      title.includes("tài khoản") ||
      msg.includes("tài khoản")
    ) {
      navigate(ROUTES.privateSettings);
      return;
    }

    if (
      type === "access_request" ||
      title.includes("truy cập") ||
      msg.includes("truy cập") ||
      title.includes("xin quyền")
    ) {
      if (role === "doctor") {
        navigate(ROUTES.doctorPatientManagement);
      } else {
        navigate(ROUTES.consent);
      }
    } else if (
      type === "prescription_reminder" ||
      type === "prescription_new" ||
      title.includes("thuốc") ||
      msg.includes("thuốc") ||
      title.includes("kê đơn")
    ) {
      if (role === "doctor") {
        navigate(ROUTES.doctorPatientManagement);
      } else {
        navigate(ROUTES.prescriptions);
      }
    }
  };
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
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-white/70 backdrop-blur-glass px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Mở điều hướng"
          className="rounded-xl p-2 text-mutedForeground hover:bg-muted/60 lg:hidden transition-all duration-200"
          onClick={() => setMobileSidebarOpen(true)}
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-secondary tracking-tight lg:text-lg">{title}</h1>
          {description ? (
            <p className="hidden truncate text-xs font-medium text-mutedForeground sm:block mt-0.5">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {role === "user" ? (
          <div className="relative">
            <button
              aria-label="QR cấp cứu"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border/50 bg-white/60 backdrop-blur-sm px-3.5 text-xs font-semibold text-secondary shadow-soft-sm transition-all hover:bg-white hover:shadow-soft"
              type="button"
              onClick={() => {
                setQrOpen((v) => !v);
                setOpen(false);
                setActiveQrIndex(0);
              }}
            >
              <QrCode className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">QR cấp cứu</span>
            </button>

            {qrOpen ? (
              <div className="absolute right-0 mt-2.5 w-72 rounded-card border border-white/60 bg-white/80 backdrop-blur-glass p-4 shadow-soft-lg z-50 animate-scale-in">
                <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2">
                  <strong className="text-sm font-bold text-secondary">Mã QR cấp cứu</strong>
                  <button
                    className="text-xs text-primary hover:underline font-bold"
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
                        <p className="text-xs text-mutedForeground mb-3 font-medium">Chưa có mã QR hoạt động</p>
                        <Link
                          to={ROUTES.publicSetting}
                          className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primaryDark px-4 text-xs font-semibold text-white transition hover:shadow-soft"
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
                      <div className="relative p-2 bg-white rounded-xl border border-border/50 shadow-soft-sm">
                        <QRPreview token={currentToken.token} size={150} />
                      </div>
                      
                      {activeTokens.length > 1 ? (
                        <div className="flex items-center justify-between w-full mt-1">
                          <button
                            type="button"
                            className="p-1 rounded-lg border border-border/50 hover:bg-muted/60 text-secondary"
                            onClick={() => {
                              setActiveQrIndex((prev) => (prev - 1 + activeTokens.length) % activeTokens.length);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-xs font-bold text-secondary">
                            QR {safeIndex + 1} / {activeTokens.length}
                          </span>
                          <button
                            type="button"
                            className="p-1 rounded-lg border border-border/50 hover:bg-muted/60 text-secondary"
                            onClick={() => {
                              setActiveQrIndex((prev) => (prev + 1) % activeTokens.length);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}

                      <div className="w-full text-center space-y-1 mt-2 text-[10px] text-mutedForeground font-medium">
                        <p className="font-bold text-secondary truncate">
                          Mã: {currentToken.token.substring(0, 12)}...
                        </p>
                        <p>
                          Hạn dùng: {currentToken.expiresAt ? formatDate(currentToken.expiresAt) : "Vĩnh viễn"}
                        </p>
                        <div className="pt-2 flex flex-wrap gap-1 justify-center">
                          {currentToken.showBloodType && <span className="bg-blue-50/80 text-blue-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">Nhóm máu</span>}
                          {currentToken.showAllergies && <span className="bg-red-50/80 text-red-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">Dị ứng</span>}
                          {currentToken.showEmergencyContact && <span className="bg-green-50/80 text-green-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">Liên hệ</span>}
                        </div>
                      </div>

                      <Link
                        to={ROUTES.publicSetting}
                        className="mt-2 w-full text-center text-xs text-primary hover:underline font-bold"
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
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-white/60 backdrop-blur-sm text-mutedForeground shadow-soft-sm hover:bg-white hover:shadow-soft transition-all duration-200"
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              setQrOpen(false);
            }}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emergency px-1 text-[10px] font-bold text-white shadow-soft-sm animate-pulse">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 mt-2.5 w-80 rounded-card border border-border bg-white p-4 shadow-soft-lg z-50 animate-scale-in">
              <div className="mb-2.5 flex items-center justify-between border-b border-border/40 pb-2">
                <strong className="text-sm font-bold text-secondary">Thông báo</strong>
                <button className="text-xs text-primary font-bold hover:underline" onClick={() => { markAllLocalRead(); }} type="button">Đánh dấu tất cả</button>
              </div>
              <ul className="max-h-64 overflow-auto space-y-2">
                {items.length === 0 ? <li className="text-xs text-mutedForeground font-medium py-3 text-center">Không có thông báo</li> : null}
                {items.map((it) => {
                  const { title: tTitle, message: tMsg } = translateNotification(it.title || "", it.message || "");
                  return (
                    <li
                      key={it.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors flex flex-col gap-1.5 cursor-pointer"
                      onClick={() => handleNotificationClick(it)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${!it.isRead ? "font-bold text-secondary" : "text-mutedForeground font-medium"}`}>{tTitle}</p>
                        {!it.isRead ? (
                          <button
                            className="text-[10px] text-primary font-bold hover:underline shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              void markAsRead(it.id);
                            }}
                            type="button"
                          >
                            Đọc
                          </button>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-mutedForeground leading-relaxed">{tMsg}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="hidden items-center gap-2 pl-2 md:flex">
          <Badge
            tone={role === "admin" ? "admin" : role === "doctor" ? "success" : "info"}
            className="inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-xs font-semibold leading-none shadow-soft-sm"
          >
            {currentUser?.fullName ?? roleLabels[role]}
          </Badge>
        </div>
      </div>
    </header>
  );
}
