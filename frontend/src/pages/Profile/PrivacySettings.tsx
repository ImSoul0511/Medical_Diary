import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Plus, Trash2, Calendar, Clock, Eye, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Button } from "../../components/Button";
import { useEmergencyStore } from "../../store/emergencyStore";
import { formatDate } from "../../utils/date";
import { Card } from "../../components/Card";
import { QRPreview } from "../../components/QRPreview";
import { FormInput } from "../../components/FormInput";
import { useUiStore } from "../../store/uiStore";
import { useUserStore } from "../../store/userStore";
import type { PrivacySettings as PrivacySettingsType } from "../../types/users";

const defaultSettings: PrivacySettingsType = {
  showBloodType: false,
  showAllergies: false,
  showEmergencyContact: false,
};

const fields: Array<{
  key: keyof PrivacySettingsType;
  label: string;
}> = [
    {
      key: "showBloodType",
      label: "Nhóm máu",
    },
    {
      key: "showAllergies",
      label: "Dị ứng",
    },
    {
      key: "showEmergencyContact",
      label: "SĐT người thân",
    },
  ];

export function PrivacySettings() {
  const profile = useUserStore((state) => state.profile);
  const loadMe = useUserStore((state) => state.loadMe);
  const updatePrivacy = useUserStore((state) => state.updatePrivacy);
  const showToast = useUiStore((state) => state.showToast);

  const settings = profile?.privacySettings ?? defaultSettings;
  const enabledCount = Object.values(settings).filter(Boolean).length;

  const tokens = useEmergencyStore((state) => state.tokens);
  const accessHistory = useEmergencyStore((state) => state.accessHistory);
  const loadTokens = useEmergencyStore((state) => state.loadTokens);
  const createToken = useEmergencyStore((state) => state.createToken);
  const revokeToken = useEmergencyStore((state) => state.revokeToken);
  const loadTokenHistory = useEmergencyStore((state) => state.loadTokenHistory);

  const [selectedTtl, setSelectedTtl] = useState<number | null>(null);
  const [showBlood, setShowBlood] = useState(true);
  const [showAllergiesField, setShowAllergiesField] = useState(true);
  const [showEmergencyField, setShowEmergencyField] = useState(true);
  const [activeTokenIndex, setActiveTokenIndex] = useState(0);

  useEffect(() => {
    void loadMe().catch(() => undefined);
    void loadTokens().catch(() => undefined);
    void loadTokenHistory().catch(() => undefined);
  }, [loadMe, loadTokens, loadTokenHistory]);

  const activeTokens = tokens.filter((t) => !t.isExpired);

  // Điều chỉnh index nếu số lượng token giảm (do bị xóa)
  useEffect(() => {
    if (activeTokens.length > 0 && activeTokenIndex >= activeTokens.length) {
      setActiveTokenIndex(Math.max(0, activeTokens.length - 1));
    } else if (activeTokens.length === 0 && activeTokenIndex !== 0) {
      setActiveTokenIndex(0);
    }
  }, [activeTokens.length, activeTokenIndex]);

  const currentToken = activeTokens[activeTokenIndex];

  return (
    <AppShell role="user" title="Quản lý truy cập công khai">
      <div className="grid gap-6 xl:grid-cols-[350px_1fr]">
        {/* Cột trái: Hồ sơ cấp cứu chung */}
        <div className="space-y-6">
          <Card padding="lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-card bg-infoBg p-3 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary">Hồ sơ cấp cứu chung</h2>
                <p className="text-sm text-mutedForeground">{enabledCount}/3 trường đang bật.</p>
              </div>
            </div>
            <div className="space-y-3">
              {fields.map((field) => (
                <label
                  className="flex items-start justify-between gap-4 rounded-card border border-border p-4 hover:bg-slate-50 transition cursor-pointer"
                  key={field.key}
                >
                  <span>
                    <span className="block font-medium text-secondary">{field.label}</span>
                  </span>
                  <input
                    checked={settings[field.key]}
                    className="mt-1 h-5 w-10 accent-primary"
                    onChange={(event) => {
                      void updatePrivacy({ [field.key]: event.target.checked })
                        .then(() => showToast("Đã cập nhật quyền riêng tư."))
                        .catch(() => undefined);
                    }}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          </Card>

          {/* Box hiển thị thông tin thực tế */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-secondary mb-4">Xem trước thông tin cấp cứu</h3>
            <div className="space-y-3">
              {settings.showBloodType ? (
                <div className="rounded-card bg-blue-50 border border-blue-100 p-4">
                  <p className="text-xs text-blue-700 font-medium">Nhóm máu</p>
                  <p className="text-lg font-semibold text-blue-900">{profile?.bloodType ?? "Chưa cập nhật"}</p>
                </div>
              ) : null}
              {settings.showAllergies ? (
                <div className="rounded-card bg-red-50 border border-red-100 p-4">
                  <p className="text-xs text-red-700 font-medium">Dị ứng</p>
                  <p className="font-semibold text-red-900">{profile?.allergies ?? "Chưa cập nhật"}</p>
                </div>
              ) : null}
              {settings.showEmergencyContact ? (
                <div className="rounded-card bg-green-50 border border-green-100 p-4">
                  <p className="text-xs text-green-700 font-medium">SĐT người thân</p>
                  <p className="font-semibold text-green-900">{profile?.emergencyContact ?? "Chưa cập nhật"}</p>
                </div>
              ) : null}
              {!settings.showBloodType && !settings.showAllergies && !settings.showEmergencyContact && (
                <p className="text-xs text-mutedForeground italic">Bạn chưa bật công khai trường thông tin nào.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Cột phải: Quản lý mã QR cấp cứu */}
        <Card padding="lg">
          <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold text-secondary">Mã QR Cấp cứu thực tế</h2>
              <p className="text-sm text-mutedForeground">
                Quản lý các mã QR truy xuất thông tin cấp cứu lâm thời hoặc vĩnh viễn (tối đa 4 mã hoạt động).
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-secondary">
              Đang hoạt động: {activeTokens.length}/4
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Box 1: Tạo mã mới */}
            <div className="rounded-card border border-border p-5 bg-slate-50">
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-primary" />
                Tạo mã QR cấp cứu mới
              </h3>

              {activeTokens.length >= 4 ? (
                <div className="rounded border border-warning/30 bg-warningBg p-4 text-center mt-4">
                  <AlertTriangle className="mx-auto h-6 w-6 text-warning mb-2 animate-bounce" />
                  <p className="text-xs font-medium text-warningDark leading-relaxed">
                    Bạn đã đạt giới hạn tối đa 4 mã QR đang hoạt động. Vui lòng vô hiệu hóa bớt mã cũ trước khi tạo thêm.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-secondary">Thời gian hiệu lực</label>
                    <select
                      className="w-full rounded-input border border-border bg-white px-3 py-2 text-xs text-secondary outline-none focus:border-primary"
                      value={selectedTtl === null ? "" : selectedTtl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTtl(val === "" ? null : Number(val));
                      }}
                    >
                      <option value="">Vĩnh viễn (In ra mang theo)</option>
                      <option value="60">Hạn 1 giờ</option>
                      <option value="1440">Hạn 1 ngày</option>
                      <option value="10080">Hạn 7 ngày</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-secondary">Thông tin hiển thị cho mã này</label>

                    <label className="flex items-center gap-2 rounded border border-border bg-white p-2.5 text-xs text-secondary cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={showBlood}
                        onChange={(e) => setShowBlood(e.target.checked)}
                        className="accent-primary h-4 w-4"
                      />
                      <span>Nhóm máu ({profile?.bloodType ?? "Chưa có"})</span>
                    </label>

                    <label className="flex items-center gap-2 rounded border border-border bg-white p-2.5 text-xs text-secondary cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={showAllergiesField}
                        onChange={(e) => setShowAllergiesField(e.target.checked)}
                        className="accent-primary h-4 w-4"
                      />
                      <span>Dị ứng ({profile?.allergies ? "Đã nhập" : "Chưa có"})</span>
                    </label>

                    <label className="flex items-center gap-2 rounded border border-border bg-white p-2.5 text-xs text-secondary cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={showEmergencyField}
                        onChange={(e) => setShowEmergencyField(e.target.checked)}
                        className="accent-primary h-4 w-4"
                      />
                      <span>SĐT người thân</span>
                    </label>
                  </div>

                  <Button
                    onClick={() => {
                      void createToken({
                        ttlMinutes: selectedTtl,
                        showBloodType: showBlood,
                        showAllergies: showAllergiesField,
                        showEmergencyContact: showEmergencyField,
                      })
                        .then(() => {
                          showToast("Đã kích hoạt mã QR cấp cứu mới.");
                          void loadTokens();
                        })
                        .catch(() => undefined);
                    }}
                    className="w-full text-xs py-2"
                    leftIcon={<Plus className="h-4 w-4" />}
                    size="sm"
                  >
                    Tạo mã QR cấp cứu
                  </Button>
                </div>
              )}
            </div>

            {/* Box 2: Danh sách mã hoạt động */}
            <div className="space-y-4 h-full flex flex-col">
              <h3 className="text-sm font-semibold text-secondary mb-1">
                Các mã QR đang hoạt động
              </h3>

              {activeTokens.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border p-8 text-center h-[280px] w-full">
                  <AlertTriangle className="mx-auto h-8 w-8 text-mutedForeground mb-2" />
                  <p className="text-xs text-mutedForeground italic">Bạn chưa tạo mã QR hoạt động nào.</p>
                </div>
              ) : (
                <div className="flex flex-col pt-4 h-[280px] w-full">
                  {currentToken && (
                    <div className="flex gap-4 rounded-card border border-border p-5 bg-white items-center shadow-sm">
                      <div className="p-2 bg-white border border-border rounded flex-shrink-0 flex items-center justify-center shadow-sm">
                        <QRPreview token={currentToken.token} size={120} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-secondary">
                            Mã #{activeTokenIndex + 1}
                          </span>
                          <button
                            onClick={() => {
                              void revokeToken(currentToken.id)
                                .then(() => {
                                  showToast("Đã vô hiệu hóa mã QR.");
                                  void loadTokens();
                                })
                                .catch(() => undefined);
                            }}
                            className="p-1.5 text-mutedForeground hover:text-emergency hover:bg-slate-100 rounded transition"
                            title="Vô hiệu hóa mã QR này"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-mutedForeground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Tạo: {formatDate(currentToken.createdAt)}
                          </p>
                          <p className="text-xs text-mutedForeground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Hạn: {currentToken.expiresAt ? formatDate(currentToken.expiresAt) : "Vĩnh viễn"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {currentToken.showBloodType && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">Nhóm máu</span>}
                          {currentToken.showAllergies && <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-medium">Dị ứng</span>}
                          {currentToken.showEmergencyContact && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-medium">Liên hệ</span>}
                        </div>
                        <a
                          href={`${window.location.origin}/cap-cuu/${currentToken.token}`}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold pt-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem trang công khai
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Controls - Dành sẵn không gian chiều cao để không bị nhảy khung khi thêm mã thứ 2 */}
                  <div className="mt-3 flex h-10 items-center justify-center">
                    {activeTokens.length > 1 && (
                      <div className="flex justify-center items-center gap-4">
                        <button
                          onClick={() => setActiveTokenIndex(prev => prev > 0 ? prev - 1 : activeTokens.length - 1)}
                          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-secondary transition shadow-sm"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="flex gap-2">
                          {activeTokens.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveTokenIndex(idx)}
                              className={`h-2 rounded-full transition-all ${idx === activeTokenIndex ? 'w-6 bg-primary' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                              aria-label={`Xem mã ${idx + 1}`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setActiveTokenIndex(prev => prev < activeTokens.length - 1 ? prev + 1 : 0)}
                          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-secondary transition shadow-sm"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lịch sử quét QR */}
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-secondary mb-3">Lịch sử quét QR cấp cứu của bạn</h3>
            {accessHistory.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {accessHistory.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-input border border-border p-3 text-xs bg-slate-50">
                    <span className="font-medium text-secondary">
                      Yêu cầu truy cập cấp cứu thành công
                    </span>
                    <span className="text-mutedForeground">
                      {formatDate(log.accessedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mutedForeground italic">Chưa có lượt quét nào được ghi nhận.</p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
