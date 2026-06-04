import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, Phone, ShieldAlert } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { QRPreview } from "../../components/QRPreview";
import { useEmergencyStore } from "../../store/emergencyStore";

export function EmergencyPublicView() {
  const { token = "demo-token" } = useParams();
  const navigate = useNavigate();
  const profile = useEmergencyStore((state) => state.publicProfile);
  const loadPublicProfile = useEmergencyStore((state) => state.loadPublicProfile);
  const error = useEmergencyStore((state) => state.error);

  useEffect(() => {
    void loadPublicProfile(token).catch(() => undefined);
  }, [loadPublicProfile, token]);

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
            <p className="mt-2 text-sm text-white/80">Token: {token}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center rounded-input bg-white/10 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/20"
              onClick={() => navigate(-1)}
              type="button"
            >
              <ArrowLeft className="-ml-1 mr-2 h-4 w-4" />
              Quay lại
            </button>
            <QRPreview compact label="Token" token={token} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <Card className="border-white/20 bg-white text-secondary" padding="lg">
            <div className="mb-5 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-emergency" />
              <div>
                <p className="text-sm text-mutedForeground">Bệnh nhân</p>
                <h2 className="text-2xl font-semibold">{profile?.fullName ?? "Không có dữ liệu"}</h2>
              </div>
            </div>
            {error ? <p className="mb-4 text-sm text-emergency">{error}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card bg-infoBg p-4">
                <p className="text-xs text-blue-700">Nhóm máu</p>
                <p className="text-3xl font-semibold text-blue-900">{profile?.bloodType ?? "--"}</p>
              </div>
              <div className="rounded-card bg-dangerBg p-4">
                <p className="text-xs text-red-700">Dị ứng</p>
                <p className="text-xl font-semibold text-red-900">{profile?.allergies ?? "--"}</p>
              </div>
              <div className="rounded-card bg-successBg p-4 sm:col-span-2">
                <p className="text-xs text-green-700">Liên hệ khẩn cấp</p>
                <p className="text-xl font-semibold text-green-900">{profile?.emergencyContact ?? "--"}</p>
              </div>
            </div>
          </Card>

          <Card className="border-white/20 bg-white/10 text-white" padding="lg">
            <Badge tone="emergency">Không cần đăng nhập</Badge>
            <h2 className="mt-4 text-xl font-semibold">Lưu ý cho người hỗ trợ</h2>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Trang này chỉ hiển thị dữ liệu public do backend emergency endpoint trả về.
            </p>
            {profile?.emergencyContact ? (
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
