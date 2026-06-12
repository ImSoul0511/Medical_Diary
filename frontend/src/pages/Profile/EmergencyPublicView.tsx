import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, Phone, ShieldAlert } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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
    <main className="min-h-screen bg-emergency px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold shadow-soft-sm">
              <ShieldAlert className="h-4 w-4" />
              Thông tin cấp cứu
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Thông tin cấp cứu</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/20 active:scale-[0.98] transition-all"
              onClick={() => navigate(-1)}
              type="button"
            >
              <ArrowLeft className="-ml-1 mr-2 h-4 w-4" />
              Quay lại
            </button>
            <QRPreview compact label="QR cấp cứu" token={token} />
          </div>
        </div>

        {error ? (
          <div className="mx-auto max-w-xl text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 space-y-5 shadow-soft-xl">
            <div className="mx-auto w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Truy cập không hợp lệ hoặc hết hạn</h2>
            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Liên kết cấp cứu này không hợp lệ, đã bị thu hồi hoặc đã quá thời hạn cho phép. Vui lòng xác minh lại mã QR.
            </p>
            <div className="pt-2">
              <button
                className="inline-flex items-center rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-emergency hover:bg-slate-100 transition shadow-md"
                onClick={() => navigate("/")}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <Card className="border-white/25 bg-white text-secondary shadow-soft-lg rounded-2xl backdrop-blur-none" padding="lg">
              <div className="mb-6 flex items-center gap-3.5">
                <div className="rounded-2xl bg-red-50 p-2.5 shadow-soft-sm">
                  <AlertTriangle className="h-8 w-8 text-emergency animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mutedForeground tracking-wider uppercase">Bệnh nhân</p>
                  <h2 className="text-2xl font-bold text-secondary tracking-tight">{profile?.fullName ?? "Không có dữ liệu"}</h2>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-infoBg/80 p-4.5 border border-blue-100 shadow-soft-sm">
                  <p className="text-xs font-bold text-blue-700">Nhóm máu</p>
                  <p className="mt-1 text-3xl font-bold text-blue-900 tracking-tight">{profile?.bloodType ?? "--"}</p>
                </div>
                <div className="rounded-2xl bg-dangerBg/80 p-4.5 border border-red-100 shadow-soft-sm">
                  <p className="text-xs font-bold text-red-700">Dị ứng</p>
                  <p className="mt-1 text-xl font-bold text-red-900 leading-snug">{profile?.allergies ?? "--"}</p>
                </div>
                <div className="rounded-2xl bg-successBg/80 p-4.5 sm:col-span-2 border border-green-100 shadow-soft-sm">
                  <p className="text-xs font-bold text-green-700">SĐT người thân</p>
                  <p className="mt-1 text-xl font-bold text-green-900 tracking-wide">{profile?.emergencyContact ?? "--"}</p>
                </div>
              </div>
            </Card>

            <Card className="border-white/10 bg-white/10 text-white shadow-soft-lg rounded-2xl backdrop-blur-none" padding="lg">
              <h2 className="text-xl font-bold tracking-tight">SĐT người thân</h2>
              {profile?.emergencyContact ? (
                <a
                  className="mt-6 inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emergency hover:bg-slate-100 active:scale-[0.98] transition-all shadow-soft"
                  href={`tel:${profile.emergencyContact}`}
                >
                  <Phone className="h-4 w-4" />
                  Gọi người thân
                </a>
              ) : null}
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
