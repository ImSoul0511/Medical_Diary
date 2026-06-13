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
    <main className="min-h-screen bg-[#F97316] px-4 py-12 text-white flex flex-col justify-center items-center">
      <div className="w-full max-w-xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold shadow-soft-sm tracking-wide">
              <ShieldAlert className="h-3.5 w-3.5" />
              Thông tin cấp cứu
            </div>
            <h1 className="text-3xl font-black tracking-wider text-white">Thông tin cấp cứu</h1>
          </div>
          <div className="flex items-center gap-3">
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
                className="inline-flex items-center rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-[#F97316] hover:bg-slate-100 transition shadow-md"
                onClick={() => navigate("/")}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-white/25 bg-white text-secondary shadow-soft-xl rounded-2xl" padding="lg">
              <div className="mb-6 flex items-center gap-3.5 border-b border-slate-100 pb-4">
                <div className="rounded-2xl bg-orange-50 p-2.5 shadow-soft-sm border border-orange-100">
                  <AlertTriangle className="h-8 w-8 text-[#F97316] animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mutedForeground tracking-wider uppercase">Bệnh nhân</p>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{profile?.fullName ?? "Không có dữ liệu"}</h2>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-blue-50/60 p-4 border border-blue-100 shadow-soft-sm">
                    <p className="text-xs font-bold text-blue-700">Nhóm máu</p>
                    <p className="mt-1 text-3xl font-black text-blue-900 tracking-tight">{profile?.bloodType ?? "--"}</p>
                  </div>
                  <div className="rounded-2xl bg-red-50/60 p-4 border border-red-100 shadow-soft-sm">
                    <p className="text-xs font-bold text-red-700">Dị ứng</p>
                    <p className="mt-1 text-lg font-bold text-red-900 leading-snug truncate" title={profile?.allergies || "Không có"}>
                      {profile?.allergies ?? "Không có"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-green-50/60 p-4 border border-green-100 shadow-soft-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-green-700">SĐT người thân</p>
                    <p className="mt-1 text-xl font-bold text-green-900 tracking-wide">{profile?.emergencyContact ?? "--"}</p>
                  </div>
                  {profile?.emergencyContact ? (
                    <a
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#ea580c] active:scale-[0.98] transition-all shadow-soft"
                      href={`tel:${profile.emergencyContact}`}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Gọi người thân
                    </a>
                  ) : null}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      <div className="h-16 shrink-0" />
    </main>
  );
}
