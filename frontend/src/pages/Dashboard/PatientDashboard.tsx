import {
  Activity,
  CalendarClock,
  Footprints,
  HeartPulse,
  Pill,
  Shield,
  Wind,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { QRPreview } from "../../components/QRPreview";
import { StatCard } from "../../components/StatCard";
import { ROUTES } from "../../constants/routes";
import { useMedicalStore } from "../../store/medicalStore";
import { useUserStore } from "../../store/userStore";
import { formatDate } from "../../utils/date";
import { formatNumber } from "../../utils/format";

export function PatientDashboard() {
  const profile = useUserStore((state) => state.profile);
  const healthMetrics = useMedicalStore((state) => state.healthMetrics);
  const diaries = useMedicalStore((state) => state.diaries);
  const medicalRecords = useMedicalStore((state) => state.medicalRecords);
  const prescriptionLogs = useMedicalStore((state) => state.prescriptionLogs);
  const updatePrescriptionLogLocal = useMedicalStore((state) => state.updatePrescriptionLogLocal);

  const latestMetric = healthMetrics[healthMetrics.length - 1];
  const takenCount = prescriptionLogs.filter((log) => log.status === "taken").length;
  const medicationProgress = `${takenCount}/${prescriptionLogs.length}`;
  const chartData = healthMetrics.map((metric) => ({
    day: formatDate(metric.recordedAt, "dd/MM"),
    heartRate: metric.heartRate,
    steps: metric.stepCount,
    respiratoryRate: metric.respiratoryRate,
  }));

  return (
    <AppShell
      description="Tổng quan sức khỏe, thuốc hôm nay và quyền riêng tư."
      role="user"
      title="Trang chủ bệnh nhân"
    >
      <div className="space-y-6">
        <section className="rounded-card bg-gradient-to-r from-primary to-primaryDark p-6 text-white shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/75">Xin chào</p>
              <h2 className="mt-1 text-2xl font-semibold">{profile.fullName}</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                Dữ liệu trong bản UI này là mock local state. Các hành động chỉ cập nhật giao
                diện để bạn review flow trước khi tự nối API.
              </p>
            </div>
            <QRPreview compact label="Public QR mock" token="patient-dashboard" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={HeartPulse} label="Nhịp tim" trend="stable" unit="bpm" value={`${latestMetric.heartRate}`} />
          <StatCard icon={Activity} label="Huyết áp" tone="accent" unit="mmHg" value={`${latestMetric.systolic}/${latestMetric.diastolic}`} />
          <StatCard icon={Footprints} label="Bước chân" tone="success" unit="bước" value={formatNumber(latestMetric.stepCount)} />
          <StatCard icon={Pill} label="Thuốc hôm nay" tone="warning" value={medicationProgress} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary">Xu hướng sức khỏe</h2>
                <p className="text-sm text-mutedForeground">Nhịp tim và nhịp thở 6 ngày gần nhất.</p>
              </div>
              <Badge tone="info">Mock chart</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line dataKey="heartRate" name="Nhịp tim" stroke="#DC2626" strokeWidth={2} type="monotone" />
                  <Line dataKey="respiratoryRate" name="Nhịp thở" stroke="#7C3AED" strokeWidth={2} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary">Thuốc hôm nay</h2>
                <p className="text-sm text-mutedForeground">Cập nhật trạng thái cục bộ.</p>
              </div>
              <Pill className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-3">
              {prescriptionLogs.map((log) => (
                <div className="rounded-card border border-border p-3" key={log.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-secondary">{log.medicineName}</p>
                      <p className="text-xs text-mutedForeground">{formatDate(log.scheduledAt, "HH:mm dd/MM")}</p>
                    </div>
                    <Badge tone={log.status === "taken" ? "success" : "pending"}>
                      {log.status === "taken" ? "Đã uống" : "Chưa uống"}
                    </Badge>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    onClick={() =>
                      updatePrescriptionLogLocal(log.id, log.status === "taken" ? "untaken" : "taken")
                    }
                    size="sm"
                    variant={log.status === "taken" ? "outline" : "success"}
                  >
                    {log.status === "taken" ? "Hoàn tác" : "Đánh dấu đã uống"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-secondary">Nhật ký gần nhất</h3>
                <p className="text-sm text-mutedForeground">{diaries[0]?.content ?? "Chưa có nhật ký."}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Wind className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-semibold text-secondary">Hồ sơ mới</h3>
                <p className="text-sm text-mutedForeground">{medicalRecords[0]?.title}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-success" />
              <div>
                <h3 className="font-semibold text-secondary">Quyền riêng tư</h3>
                <p className="text-sm text-mutedForeground">
                  {profile.privacySettings.showEmergencyContact ? "Có SĐT khẩn cấp" : "Ẩn SĐT khẩn cấp"}
                </p>
              </div>
            </div>
            <Link className="mt-3 inline-flex text-sm font-medium text-primary" to={ROUTES.privacy}>
              Cấu hình public view
            </Link>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
