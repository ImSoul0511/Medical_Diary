import {
  CalendarClock,
  Footprints,
  HeartPulse,
  Pill,
  Shield,
  Wind, QrCode,
} from "lucide-react";
import { useEffect } from "react";
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
import { useDiaryStore } from "../../store/diaryStore";
import { useHealthMetricsStore } from "../../store/healthMetricsStore";
import { useMedicalRecordStore } from "../../store/medicalRecordStore";
import { usePrescriptionStore } from "../../store/prescriptionStore";
import { useUserStore } from "../../store/userStore";
import { formatDate } from "../../utils/date";
import { formatNumber } from "../../utils/format";

function metricValue(value: number | null | undefined) {
  return value == null ? "--" : String(value);
}

export function PatientDashboard() {
  const profile = useUserStore((state) => state.profile);
  const loadMe = useUserStore((state) => state.loadMe);
  const healthMetrics = useHealthMetricsStore((state) => state.items);
  const loadMetrics = useHealthMetricsStore((state) => state.loadMine);
  const diaries = useDiaryStore((state) => state.items);
  const loadDiaries = useDiaryStore((state) => state.loadMine);
  const medicalRecords = useMedicalRecordStore((state) => state.myRecords);
  const loadRecords = useMedicalRecordStore((state) => state.loadMine);
  const prescriptionLogs = usePrescriptionStore((state) => state.todayLogs);
  const loadPrescriptions = usePrescriptionStore((state) => state.loadPrescriptions);
  const updateLogStatus = usePrescriptionStore((state) => state.updateLogStatus);

  useEffect(() => {
    void loadMe().catch(() => undefined);
    void loadMetrics().catch(() => undefined);
    void loadDiaries().catch(() => undefined);
    void loadRecords().catch(() => undefined);
    void loadPrescriptions().catch(() => undefined);
  }, [loadDiaries, loadMe, loadMetrics, loadPrescriptions, loadRecords]);

  const latestMetric = healthMetrics[0];
  const takenCount = prescriptionLogs.filter((log) => log.status === "taken").length;
  const medicationProgress =
    prescriptionLogs.length > 0 ? `${takenCount}/${prescriptionLogs.length}` : "0/0";
  const chartData = healthMetrics.map((metric) => ({
    day: formatDate(metric.recordedAt, "dd/MM"),
    heartRate: metric.heartRate,
    respiratoryRate: metric.respiratoryRate,
  }));

  return (
    <AppShell role="user" title="Trang chủ bệnh nhân">
      <div className="space-y-6">
        <section className="rounded-card bg-gradient-to-r from-primary to-primaryDark p-6 text-white shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/75">Xin chào</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {profile?.fullName ?? "Đang tải hồ sơ"}
              </h2>
            </div>
            <Link
              to={ROUTES.privacy}
              className="group flex flex-col items-center justify-center rounded-card border border-white/20 bg-white/10 p-3 hover:bg-white/20 transition duration-200"
              title="Quản lý mã QR cấp cứu"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded bg-white text-primary">
                <QrCode className="h-8 w-8" />
              </div>
              <span className="mt-1.5 text-xs font-semibold text-white/90 group-hover:text-white">
                Tạo & Quản lý QR
              </span>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={HeartPulse} label="Nhịp tim" trend="stable" unit="bpm" value={metricValue(latestMetric?.heartRate)} />
          <StatCard icon={Wind} label="Nhịp thở" tone="accent" unit="lần/phút" value={metricValue(latestMetric?.respiratoryRate)} />
          <StatCard icon={Footprints} label="Bước chân" tone="success" unit="bước" value={latestMetric?.stepCount == null ? "--" : formatNumber(latestMetric.stepCount)} />
          <StatCard icon={Pill} label="Thuốc hôm nay" tone="warning" value={medicationProgress} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary">Xu hướng sức khỏe</h2>
                <p className="text-sm text-mutedForeground">Nhịp tim và nhịp thở theo thời gian.</p>
              </div>
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
                <p className="text-sm text-mutedForeground">Cập nhật trạng thái dùng thuốc.</p>
              </div>
              <Pill className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-3">
              {prescriptionLogs.length === 0 ? (
                <p className="text-sm text-mutedForeground">Chưa có lịch uống thuốc.</p>
              ) : null}
              {prescriptionLogs.map((log) => (
                <div className="rounded-card border border-border p-3" key={log.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-secondary">Lịch uống thuốc</p>
                      <p className="text-xs text-mutedForeground">
                        {log.scheduledTime} {formatDate(log.scheduledDate)}
                      </p>
                    </div>
                    <Badge tone={log.status === "taken" ? "success" : "pending"}>
                      {log.status === "taken" ? "Đã uống" : "Chưa uống"}
                    </Badge>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => {
                      void updateLogStatus(log.id, log.status === "taken" ? "untaken" : "taken");
                    }}
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
                <p className="text-sm text-mutedForeground">
                  {medicalRecords[0]?.diagnosis ?? "Chưa có hồ sơ bệnh án."}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-success" />
              <div>
                <h3 className="font-semibold text-secondary">Quyền riêng tư</h3>
                <p className="text-sm text-mutedForeground">
                  {profile?.privacySettings.showEmergencyContact ? "Có SĐT khẩn cấp" : "Ẩn SĐT khẩn cấp"}
                </p>
              </div>
            </div>
            <Link className="mt-3 inline-flex text-sm font-medium text-primary" to={ROUTES.privacy}>
              Cài đặt quyền riêng tư
            </Link>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
