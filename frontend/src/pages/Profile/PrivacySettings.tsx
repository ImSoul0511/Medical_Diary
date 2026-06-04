import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { QRPreview } from "../../components/QRPreview";
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
  description: string;
}> = [
  {
    key: "showBloodType",
    label: "Nhóm máu",
    description: "Khuyến nghị bật để hỗ trợ cấp cứu nhanh.",
  },
  {
    key: "showAllergies",
    label: "Dị ứng",
    description: "Giúp tránh thuốc hoặc thực phẩm nguy hiểm.",
  },
  {
    key: "showEmergencyContact",
    label: "SĐT người thân",
    description: "Chỉ bật nếu bạn đồng ý hiển thị số liên hệ.",
  },
];

export function PrivacySettings() {
  const profile = useUserStore((state) => state.profile);
  const loadMe = useUserStore((state) => state.loadMe);
  const updatePrivacy = useUserStore((state) => state.updatePrivacy);
  const showToast = useUiStore((state) => state.showToast);
  const settings = profile?.privacySettings ?? defaultSettings;
  const enabledCount = Object.values(settings).filter(Boolean).length;

  useEffect(() => {
    void loadMe().catch(() => undefined);
  }, [loadMe]);

  return (
    <AppShell
      description="Cấu hình thông tin hiển thị trong public emergency view."
      role="user"
      title="Cài đặt quyền riêng tư"
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card padding="lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-card bg-infoBg p-3 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary">Public emergency view</h2>
              <p className="text-sm text-mutedForeground">{enabledCount}/3 trường đang bật.</p>
            </div>
          </div>
          <div className="space-y-3">
            {fields.map((field) => (
              <label
                className="flex items-start justify-between gap-4 rounded-card border border-border p-4"
                key={field.key}
              >
                <span>
                  <span className="block font-medium text-secondary">{field.label}</span>
                  <span className="mt-1 block text-sm text-mutedForeground">{field.description}</span>
                </span>
                <input
                  checked={settings[field.key]}
                  className="mt-1 h-5 w-10 accent-primary"
                  onChange={(event) => {
                    void updatePrivacy({ [field.key]: event.target.checked })
                      .then(() => showToast("Đã cập nhật public view."))
                      .catch(() => undefined);
                  }}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-secondary">Preview QR cấp cứu</h2>
              <p className="text-sm text-mutedForeground">Preview chỉ hiển thị các trường đã bật.</p>
            </div>
            <Badge tone="info">Preview</Badge>
          </div>
          <div className="grid gap-5 md:grid-cols-[auto_1fr]">
            <QRPreview token="privacy-settings" />
            <div className="space-y-3">
              {settings.showBloodType ? (
                <div className="rounded-card bg-infoBg p-4">
                  <p className="text-xs text-blue-700">Nhóm máu</p>
                  <p className="text-lg font-semibold text-blue-900">{profile?.bloodType ?? "Chưa cập nhật"}</p>
                </div>
              ) : null}
              {settings.showAllergies ? (
                <div className="rounded-card bg-dangerBg p-4">
                  <p className="text-xs text-red-700">Dị ứng</p>
                  <p className="font-semibold text-red-900">{profile?.allergies ?? "Chưa cập nhật"}</p>
                </div>
              ) : null}
              {settings.showEmergencyContact ? (
                <div className="rounded-card bg-successBg p-4">
                  <p className="text-xs text-green-700">Liên hệ khẩn cấp</p>
                  <p className="font-semibold text-green-900">{profile?.emergencyContact ?? "Chưa cập nhật"}</p>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
