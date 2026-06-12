import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Lock, ShieldAlert, ShieldCheck, HeartPulse, User, Phone, Droplets } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { doctorsApi } from "../../api/doctors/doctorsApi";
import type { PatientProfileResponse } from "../../api/doctors/types";
import { formatGender } from "../../utils/gender";

export function PublicPatientProfile() {
  const { patientId = "" } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    doctorsApi
      .getPatientPublicProfile(patientId)
      .then((data) => {
        setPatient(data);
        setError(null);
      })
      .catch((err: any) => {
        setError(err?.response?.data?.detail || "Không thể tải hồ sơ công khai của bệnh nhân.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [patientId]);

  return (
    <AppShell role="doctor" title="Hồ sơ công khai bệnh nhân">
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </button>

        {loading ? (
          <Card padding="lg" className="text-center py-12">
            <p className="text-sm text-mutedForeground animate-pulse">Đang tải hồ sơ công khai...</p>
          </Card>
        ) : error ? (
          <Card padding="lg" tone="warning" className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-orange-800">Không thể truy cập</h3>
              <p className="text-xs text-orange-700 mt-1">{error}</p>
            </div>
          </Card>
        ) : patient ? (
          <div className="space-y-6">
            {/* Main Info Card */}
            <Card padding="lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-secondary">{patient.full_name}</h2>
                    <p className="text-xs text-mutedForeground mt-0.5">
                      Giới tính: {formatGender(patient.gender)}
                    </p>
                  </div>
                </div>
                <Badge tone="info">Chế độ xem công khai</Badge>
              </div>
            </Card>

            {/* Privacy details */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Nhóm máu */}
              <Card padding="lg" className="flex items-center gap-4 bg-white hover:shadow-soft transition-all duration-200">
                <div className="p-3.5 rounded-xl bg-red-50 text-red-500 shrink-0">
                  <Droplets className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mutedForeground block">
                    Nhóm máu
                  </span>
                  <div className="mt-1">
                    {patient.blood_type ? (
                      <span className="text-xl font-bold text-secondary">{patient.blood_type}</span>
                    ) : (
                      <span className="text-xs text-mutedForeground italic flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" /> Bị ẩn bởi người dùng
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Dị ứng */}
              <Card padding="lg" className="flex items-center gap-4 bg-white hover:shadow-soft transition-all duration-200">
                <div className="p-3.5 rounded-xl bg-orange-50 text-orange-500 shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mutedForeground block">
                    Dị ứng
                  </span>
                  <div className="mt-1">
                    {patient.allergies ? (
                      <span className="text-sm font-semibold text-secondary truncate block">
                        {patient.allergies}
                      </span>
                    ) : (
                      <span className="text-xs text-mutedForeground italic flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" /> Bị ẩn bởi người dùng
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Liên hệ khẩn cấp */}
              <Card padding="lg" className="flex items-center gap-4 bg-white hover:shadow-soft transition-all duration-200">
                <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-500 shrink-0">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mutedForeground block">
                    Liên hệ khẩn cấp
                  </span>
                  <div className="mt-1">
                    {patient.emergency_contact ? (
                      <span className="text-sm font-semibold text-secondary truncate block">
                        {patient.emergency_contact}
                      </span>
                    ) : (
                      <span className="text-xs text-mutedForeground italic flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" /> Bị ẩn bởi người dùng
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Locked Sections */}
            <Card padding="lg" className="border border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="h-5 w-5 text-slate-400" />
                <h3 className="text-sm font-semibold text-secondary">
                  Các thông tin bảo mật của bệnh nhân
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div>
                    <span className="text-xs font-medium text-slate-700">Ngày sinh</span>
                    <p className="text-xs text-mutedForeground">Chỉ hiển thị khi có quyền chi tiết</p>
                  </div>
                  <span className="text-xs text-mutedForeground italic">Bảo mật</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div>
                    <span className="text-xs font-medium text-slate-700">Chỉ số sức khỏe & Triệu chứng</span>
                    <p className="text-xs text-mutedForeground">Biểu đồ đo lường nhịp tim, nhịp thở, bước chân, v.v.</p>
                  </div>
                  <span className="text-xs text-mutedForeground italic">Bảo mật</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div>
                    <span className="text-xs font-medium text-slate-700">Hồ sơ bệnh án & Đơn thuốc</span>
                    <p className="text-xs text-mutedForeground">Lịch sử khám chữa bệnh và danh sách thuốc điều trị</p>
                  </div>
                  <span className="text-xs text-mutedForeground italic">Bảo mật</span>
                </div>
              </div>

              <div className="mt-8 text-center bg-white p-4 border border-slate-200/80 rounded-xl shadow-soft-sm">
                <p className="text-xs text-secondary font-medium">Bạn có muốn xem toàn bộ thông tin bệnh án của bệnh nhân?</p>
                <div className="mt-3 flex justify-center gap-3">
                  <Link
                    to="/bac-si/tim-kiem"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-input bg-primary px-4 text-xs font-semibold text-white shadow hover:bg-primary/95 transition-all"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Xin quyền truy cập chi tiết
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
