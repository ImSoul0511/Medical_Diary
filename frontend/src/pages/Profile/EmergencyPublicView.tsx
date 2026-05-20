import { AlertTriangle, Phone, ShieldAlert } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { QRPreview } from "../../components/QRPreview";
import { useUserStore } from "../../store/userStore";

export function EmergencyPublicView() {
  const { token = "demo-token" } = useParams();
  const profile = useUserStore((state) => state.profile);
  const settings = profile.privacySettings;

  return (
    <main className="min-h-screen bg-emergency px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4" />
              Public emergency view
            </div>
            <h1 className="text-3xl font-semibold">Thông tin cấp cứu</h1>
            <p className="mt-2 text-sm text-white/80">
              Route công khai mock. Token: {token}
            </p>
          </div>
          <QRPreview compact label="Token mock" token={token} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <Card className="border-white/20 bg-white text-secondary" padding="lg">
            <div className="mb-5 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-emergency" />
              <div>
                <p className="text-sm text-mutedForeground">Bệnh nhân</p>
                <h2 className="text-2xl font-semibold">{profile.fullName}</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {settings.showBloodType ? (
                <div className="rounded-card bg-infoBg p-4">
                  <p className="text-xs text-blue-700">Nhóm máu</p>
                  <p className="text-3xl font-semibold text-blue-900">{profile.bloodType}</p>
                </div>
              ) : null}
              {settings.showAllergies ? (
                <div className="rounded-card bg-dangerBg p-4">
                  <p className="text-xs text-red-700">Dị ứng</p>
                  <p className="text-xl font-semibold text-red-900">{profile.allergies}</p>
                </div>
              ) : null}
              {settings.showEmergencyContact ? (
                <div className="rounded-card bg-successBg p-4 sm:col-span-2">
                  <p className="text-xs text-green-700">Liên hệ khẩn cấp</p>
                  <p className="text-xl font-semibold text-green-900">{profile.emergencyContact}</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="border-white/20 bg-white/10 text-white" padding="lg">
            <Badge tone="emergency">Không cần đăng nhập</Badge>
            <h2 className="mt-4 text-xl font-semibold">Lưu ý cho người hỗ trợ</h2>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Chỉ các trường bệnh nhân bật trong quyền riêng tư mới hiển thị. Bản này không
              truy vấn backend và không ghi audit log thật.
            </p>
            {settings.showEmergencyContact ? (
              <a
                className="mt-6 inline-flex items-center gap-2 rounded-input bg-white px-4 py-2 text-sm font-semibold text-emergency"
                href={`tel:${profile.emergencyContact}`}
              >
                <Phone className="h-4 w-4" />
                Gọi người thân
              </a>
            ) : null}
          </Card>
        </div>
      </div>
    </main>
  );
}
