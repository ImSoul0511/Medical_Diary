import { useEffect } from "react";
import { Activity, ArrowLeft, HeartPulse, NotebookText, Pill } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { ROUTES } from "../../constants/routes";
import { useDiaryStore } from "../../store/diaryStore";
import { useDoctorStore } from "../../store/doctorStore";
import { useHealthMetricsStore } from "../../store/healthMetricsStore";
import { useMedicalRecordStore } from "../../store/medicalRecordStore";
import type { DiaryEntry } from "../../types/diary";
import type { MedicalRecord } from "../../types/medicalRecord";
import { formatDate, formatDateTime } from "../../utils/date";

export function DoctorPatientDetail() {
  const { patientId = "" } = useParams();
  const patient = useDoctorStore((state) => state.selectedPatient);
  const loadPatientDetail = useDoctorStore((state) => state.loadPatientDetail);
  const doctorError = useDoctorStore((state) => state.error);
  const healthMetrics = useHealthMetricsStore((state) => state.items);
  const loadPatientMetrics = useHealthMetricsStore((state) => state.loadPatientMetrics);
  const diaries = useDiaryStore((state) => state.items);
  const loadPatientDiaries = useDiaryStore((state) => state.loadPatientDiaries);
  const medicalRecords = useMedicalRecordStore((state) => state.patientRecords);
  const loadPatientRecords = useMedicalRecordStore((state) => state.loadPatientRecords);
  const chartData = healthMetrics.map((metric) => ({
    day: formatDate(metric.recordedAt, "dd/MM"),
    heartRate: metric.heartRate,
    stepCount: metric.stepCount,
    respiratoryRate: metric.respiratoryRate,
  }));
  const latestHeartRate = healthMetrics.find((metric) => metric.heartRate != null)?.heartRate;
  const latestStepCount = healthMetrics.find((metric) => metric.stepCount != null)?.stepCount;
  const latestRespiratoryRate = healthMetrics.find(
    (metric) => metric.respiratoryRate != null,
  )?.respiratoryRate;

  useEffect(() => {
    if (!patientId) return;
    void loadPatientDetail(patientId).catch(() => undefined);
    void loadPatientMetrics(patientId).catch(() => undefined);
    void loadPatientDiaries(patientId).catch(() => undefined);
    void loadPatientRecords(patientId).catch(() => undefined);
  }, [loadPatientDetail, loadPatientDiaries, loadPatientMetrics, loadPatientRecords, patientId]);

  const diaryColumns: DataTableColumn<DiaryEntry>[] = [
    { key: "time", header: "Thời gian", render: (row) => formatDateTime(row.createdAt) },
    { key: "content", header: "Ghi chú", render: (row) => row.content },
    {
      key: "severity",
      header: "Triệu chứng",
      render: (row) => row.symptoms.map((item) => item.name).join(", "),
    },
  ];

  const recordColumns: DataTableColumn<MedicalRecord>[] = [
    { key: "diagnosis", header: "Hồ sơ", render: (row) => row.diagnosis },
    { key: "doctor", header: "Bác sĩ", render: (row) => row.doctorName ?? "Không rõ" },
    { key: "date", header: "Ngày", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <AppShell role="doctor" title="Chi tiết bệnh nhân">
      <div className="space-y-6">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          to="/bac-si/tim-kiem"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại tìm kiếm
        </Link>

        <Card padding="lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge tone={patient ? "success" : "pending"}>{patient ? "Đã cấp quyền" : "Đang chờ dữ liệu"}</Badge>
              <h2 className="mt-3 text-2xl font-semibold text-secondary">{patient?.fullName ?? "Chưa có hồ sơ"}</h2>
              <p className="text-sm text-mutedForeground">
                {patient
                  ? `Giới tính ${patient.gender} - Nhóm máu ${patient.bloodType ?? "chưa cập nhật"}`
                  : doctorError ?? "Chọn bệnh nhân từ trang tìm kiếm."}
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-accent px-4 text-sm font-medium text-white transition hover:bg-teal-700"
              to={patientId ? `/bac-si/tao-don-thuoc/${patientId}` : ROUTES.doctorPrescription}
            >
              <Pill className="h-4 w-4" />
              Tạo đơn thuốc
            </Link>
          </div>
        </Card>

        <section className="grid gap-4 lg:grid-cols-4">
          {[
            { Icon: HeartPulse, label: "Nhịp tim", value: `${latestHeartRate ?? "--"} bpm` },
            { Icon: Activity, label: "Bước chân", value: `${latestStepCount ?? "--"}` },
            { Icon: HeartPulse, label: "Nhịp thở", value: `${latestRespiratoryRate ?? "--"} lần/phút` },
            { Icon: NotebookText, label: "Nhật ký", value: `${diaries.length} bản ghi` },
          ].map(({ Icon, label, value }) => (
            <Card key={label}>
              <Icon className="h-5 w-5 text-accent" />
              <p className="mt-3 text-sm text-mutedForeground">{label}</p>
              <p className="text-xl font-semibold text-secondary">{value}</p>
            </Card>
          ))}
        </section>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-secondary">Chỉ số sức khỏe</h2>
          <div className="mt-4 h-64">
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

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-secondary">Nhật ký triệu chứng</h2>
          <DataTable columns={diaryColumns} getRowKey={(row) => row.id} rows={diaries} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-secondary">Hồ sơ bệnh án</h2>
          <DataTable columns={recordColumns} getRowKey={(row) => row.id} rows={medicalRecords} />
        </section>
      </div>
    </AppShell>
  );
}
