import { Activity, FileText, HeartPulse, NotebookText, Pill } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { ROUTES } from "../../constants/routes";
import { mockProfile } from "../../constants/mockData";
import { useMedicalStore } from "../../store/medicalStore";
import type { DiaryEntry, MedicalRecord } from "../../types/medical";
import { formatDate, formatDateTime } from "../../utils/date";

export function DoctorPatientDetail() {
  const healthMetrics = useMedicalStore((state) => state.healthMetrics);
  const diaries = useMedicalStore((state) => state.diaries);
  const medicalRecords = useMedicalStore((state) => state.medicalRecords);
  const prescriptions = useMedicalStore((state) => state.prescriptions);
  const chartData = healthMetrics.map((metric) => ({
    day: formatDate(metric.recordedAt, "dd/MM"),
    heartRate: metric.heartRate,
  }));

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
    { key: "title", header: "Hồ sơ", render: (row) => row.title },
    { key: "doctor", header: "Bác sĩ", render: (row) => row.doctorName },
    { key: "date", header: "Ngày", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <AppShell
      description="Chi tiết bệnh nhân mock sau khi bác sĩ có consent."
      role="doctor"
      title="Chi tiết bệnh nhân"
    >
      <div className="space-y-6">
        <Card padding="lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge tone="success">Consent mock active</Badge>
              <h2 className="mt-3 text-2xl font-semibold text-secondary">{mockProfile.fullName}</h2>
              <p className="text-sm text-mutedForeground">
                {mockProfile.phoneNumber} - Nhóm máu {mockProfile.bloodType}
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-accent px-4 text-sm font-medium text-white transition hover:bg-teal-700"
              to={ROUTES.doctorPrescription}
            >
              <Pill className="h-4 w-4" />
              Tạo đơn thuốc
            </Link>
          </div>
        </Card>

        <section className="grid gap-4 lg:grid-cols-4">
          {[
            { Icon: HeartPulse, label: "Nhịp tim", value: `${healthMetrics[0].heartRate} bpm` },
            { Icon: Activity, label: "Bước chân", value: `${healthMetrics[0].stepCount}` },
            { Icon: NotebookText, label: "Nhật ký", value: `${diaries.length} bản ghi` },
            { Icon: FileText, label: "Hồ sơ", value: `${medicalRecords.length} hồ sơ` },
          ].map(({ Icon, label, value }) => (
            <Card key={label}>
              <Icon className="h-5 w-5 text-accent" />
              <p className="mt-3 text-sm text-mutedForeground">{label}</p>
              <p className="text-xl font-semibold text-secondary">{value}</p>
            </Card>
          ))}
        </section>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-secondary">Vitals</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line dataKey="heartRate" name="Nhịp tim" stroke="#0D9488" strokeWidth={2} type="monotone" />
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

        <Card>
          <h2 className="font-semibold text-secondary">Đơn thuốc gần nhất</h2>
          <p className="mt-2 text-sm text-mutedForeground">{prescriptions[0]?.title}</p>
        </Card>
      </div>
    </AppShell>
  );
}
