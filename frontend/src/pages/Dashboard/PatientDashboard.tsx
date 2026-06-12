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

import { aggregateHealthMetrics } from "../../utils/healthMetrics";

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
  const chartData = aggregateHealthMetrics(healthMetrics);

  return (
    <AppShell role="user" title="Trang chủ bệnh nhân">
      <div className="space-y-8">
        <section className="relative rounded-2xl bg-gradient-to-r from-primary to-primaryDark p-6 text-white shadow-soft-md overflow-hidden">
          <div aria-hidden="true" className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/75 font-medium">Xin chào</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {profile?.fullName ?? "Đang tải hồ sơ"}
              </h2>
            </div>
            <Link
              to={ROUTES.privacy}
              className="group flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-3.5 hover:bg-white/20 hover:scale-[1.02] shadow-soft-sm transition-all duration-300"
              title="Quản lý mã QR cấp cứu"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary shadow-soft-sm">
                <QrCode className="h-8 w-8" />
              </div>
              <span className="mt-2 text-xs font-bold text-white/90 group-hover:text-white transition-colors">
                Tạo & Quản lý QR
              </span>
            </Link>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={HeartPulse} label="Nhịp tim" trend="stable" unit="bpm" value={metricValue(latestMetric?.heartRate)} />
          <StatCard icon={Wind} label="Nhịp thở" tone="accent" unit="lần/phút" value={metricValue(latestMetric?.respiratoryRate)} />
          <StatCard icon={Footprints} label="Bước chân" tone="success" unit="bước" value={latestMetric?.stepCount == null ? "--" : formatNumber(latestMetric.stepCount)} />
          <Link to={ROUTES.prescriptions} className="block transition-transform hover:scale-[1.01]">
            <StatCard icon={Pill} label="Thuốc hôm nay" tone="warning" value={medicationProgress} />
          </Link>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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

          <Card padding="lg" className="flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-secondary">Thuốc hôm nay</h2>
                  <p className="text-sm text-mutedForeground">Theo dõi và cập nhật lịch dùng thuốc.</p>
                </div>
                <Pill className="h-5 w-5 text-warning" />
              </div>

              <div className="mt-6 flex flex-col items-center justify-center text-center p-4 bg-slate-50/80 rounded-xl border border-slate-100/50">
                <span className="text-3xl font-black text-primary">{medicationProgress}</span>
                <span className="text-xs font-semibold text-secondary mt-1">Liều thuốc đã uống hôm nay</span>
                <p className="text-[11px] text-mutedForeground mt-2 max-w-[200px]">
                  {prescriptionLogs.length > 0 
                    ? "Nhấp vào nút bên dưới để mở nhật ký uống thuốc chi tiết và đánh dấu các liều đã dùng."
                    : "Hiện tại bạn không có lịch hẹn dùng thuốc nào cho ngày hôm nay."
                  }
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link to={ROUTES.prescriptions} className="block w-full">
                <Button className="w-full" variant="outline">
                  Xem nhật ký dùng thuốc
                </Button>
              </Link>
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
              </div>
            </div>
            <Link className="mt-3 inline-flex text-sm font-medium text-primary" to={ROUTES.privateSettings}>
              Cài đặt quyền riêng tư
            </Link>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
