import { FormEvent, useEffect, useState } from "react";
import { Footprints, HeartPulse, Plus, Wind } from "lucide-react";
import {
  Bar,
  BarChart,
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
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { FormSelect } from "../../components/FormSelect";
import { StatCard } from "../../components/StatCard";
import { useHealthMetricsStore } from "../../store/healthMetricsStore";
import type { HealthMetric, ManualHealthRecord, MetricType } from "../../types/healthMetrics";
import { formatDate, formatDateTime } from "../../utils/date";

function displayMetric(value: number | null | undefined) {
  return value == null ? "--" : String(value);
}

const metricTypeOptions = [
  { value: "blood_pressure", label: "Huyết áp" },
  { value: "blood_glucose", label: "Đường huyết" },
  { value: "spo2", label: "SpO2" },
  { value: "body_temperature", label: "Thân nhiệt" },
  { value: "weight", label: "Cân nặng" },
];

const mealContextOptions = [
  { value: "fasting", label: "Lúc đói" },
  { value: "after_meal", label: "Sau ăn" },
  { value: "random", label: "Ngẫu nhiên" },
];

function nowInputValue() {
  return new Date().toISOString().slice(0, 16);
}

function formatManualMetric(record: ManualHealthRecord) {
  const value = record.metrics.value;
  switch (record.metricType) {
    case "blood_pressure":
      return `${record.metrics.systolic ?? "--"}/${record.metrics.diastolic ?? "--"} mmHg`;
    case "blood_glucose":
      return `${value ?? "--"} mg/dL`;
    case "spo2":
      return `${value ?? "--"}%`;
    case "body_temperature":
      return `${value ?? "--"} C`;
    case "weight":
      return `${value ?? "--"} kg`;
    default:
      return "--";
  }
}

// Exported for use in DoctorPatientDetail
export const manualMetricLabels: Record<MetricType, string> = {
  blood_pressure: "Huyết áp",
  blood_glucose: "Đường huyết",
  spo2: "SpO2 (Oxy máu)",
  body_temperature: "Nhiệt độ cơ thể",
  weight: "Cân nặng",
};

export function formatManualMetricValue(type: MetricType, metrics: Record<string, unknown>): string {
  return formatManualMetric({ metricType: type, metrics } as ManualHealthRecord);
}

type TimelineRow = {
  id: string;
  source: "automatic" | "manual";
  label: string;
  value: string;
  recordedAt: string;
};

function automaticRows(metric: HealthMetric): TimelineRow[] {
  return [
    metric.heartRate == null
      ? null
      : {
          id: `${metric.id}-heart`,
          source: "automatic" as const,
          label: "Nhịp tim",
          value: `${metric.heartRate} bpm`,
          recordedAt: metric.recordedAt,
        },
    metric.stepCount == null
      ? null
      : {
          id: `${metric.id}-steps`,
          source: "automatic" as const,
          label: "Bước chân",
          value: `${metric.stepCount} bước`,
          recordedAt: metric.recordedAt,
        },
    metric.respiratoryRate == null
      ? null
      : {
          id: `${metric.id}-breath`,
          source: "automatic" as const,
          label: "Nhịp thở",
          value: `${metric.respiratoryRate} lần/phút`,
          recordedAt: metric.recordedAt,
        },
  ].filter(Boolean) as TimelineRow[];
}

export function HealthMetricsPage() {
  const healthMetrics = useHealthMetricsStore((state) => state.items);
  const manualItems = useHealthMetricsStore((state) => state.manualItems);
  const loadMine = useHealthMetricsStore((state) => state.loadMine);
  const loadManualMetrics = useHealthMetricsStore((state) => state.loadManualMetrics);
  const createManualMetric = useHealthMetricsStore((state) => state.createManualMetric);
  const isCreatingManual = useHealthMetricsStore((state) => state.isCreatingManual);
  const error = useHealthMetricsStore((state) => state.error);
  const [metricType, setMetricType] = useState<MetricType>("blood_pressure");
  const [manualValue, setManualValue] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [height, setHeight] = useState("");
  const [mealContext, setMealContext] = useState<"fasting" | "after_meal" | "random">("random");
  const [deviceName, setDeviceName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualRecordedAt, setManualRecordedAt] = useState(nowInputValue());
  const latest = healthMetrics[0];
  const chartData = healthMetrics
    .slice()
    .reverse()
    .map((metric) => ({
      day: formatDate(metric.recordedAt, "dd/MM"),
      heartRate: metric.heartRate,
      stepCount: metric.stepCount,
      respiratoryRate: metric.respiratoryRate,
    }));

  useEffect(() => {
    void loadMine().catch(() => undefined);
    void loadManualMetrics().catch(() => undefined);
  }, [loadManualMetrics, loadMine]);

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createManualMetric({
      metricType,
      value: manualValue,
      systolic,
      diastolic,
      pulse,
      height,
      mealContext,
      deviceName,
      notes: manualNotes,
      recordedAt: new Date(manualRecordedAt).toISOString(),
    })
      .then(() => {
        setManualValue("");
        setSystolic("");
        setDiastolic("");
        setPulse("");
        setHeight("");
        setDeviceName("");
        setManualNotes("");
        setManualRecordedAt(nowInputValue());
      })
      .catch(() => undefined);
  }

  const timelineRows: TimelineRow[] = [
    ...healthMetrics.flatMap(automaticRows),
    ...manualItems.map((record) => ({
      id: record.id,
      source: "manual" as const,
      label: metricTypeOptions.find((option) => option.value === record.metricType)?.label ?? record.metricType,
      value: formatManualMetric(record),
      recordedAt: record.recordedAt,
    })),
  ].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const timelineColumns: DataTableColumn<TimelineRow>[] = [
    { key: "label", header: "Chỉ số", render: (row) => <span className="font-medium text-secondary">{row.label}</span> },
    { key: "value", header: "Giá trị", render: (row) => row.value },
    {
      key: "source",
      header: "Nguồn",
      render: (row) => <Badge tone={row.source === "manual" ? "success" : "info"}>{row.source === "manual" ? "Nhập tay" : "Tự động"}</Badge>,
    },
    { key: "date", header: "Thời điểm", render: (row) => formatDateTime(row.recordedAt) },
  ];

  return (
    <AppShell role="user" title="Chỉ số sức khỏe">
      <div className="space-y-8 max-w-6xl">
        {error ? (
          <Card tone="warning">
            <p className="text-sm text-orange-900">{error}</p>
          </Card>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard icon={HeartPulse} label="Nhịp tim mới nhất" unit="bpm" value={displayMetric(latest?.heartRate)} />
          <StatCard icon={Footprints} label="Bước chân" tone="success" unit="bước" value={displayMetric(latest?.stepCount)} />
          <StatCard icon={Wind} label="Nhịp thở" tone="accent" unit="lần/phút" value={displayMetric(latest?.respiratoryRate)} />
        </section>

        {/* Row 1: Manual Input & History Timeline */}
        <section className="grid gap-6 xl:grid-cols-[450px_minmax(0,1fr)]">
          <Card padding="lg" className="h-fit">
            <h2 className="text-lg font-semibold text-secondary">Chỉ số nhập tay</h2>
            <form className="mt-5 space-y-4" onSubmit={handleManualSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect label="Loại chỉ số" onChange={(value) => setMetricType(value as MetricType)} options={metricTypeOptions} value={metricType} />
                <FormInput label="Thời điểm đo" onChange={(event) => setManualRecordedAt(event.target.value)} required type="datetime-local" value={manualRecordedAt} />
              </div>
              
              {metricType === "blood_pressure" ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormInput label="Tâm thu" onChange={(event) => setSystolic(event.target.value)} required type="number" value={systolic} />
                  <FormInput label="Tâm trương" onChange={(event) => setDiastolic(event.target.value)} required type="number" value={diastolic} />
                  <FormInput label="Mạch" onChange={(event) => setPulse(event.target.value)} type="number" value={pulse} />
                </div>
              ) : null}
              {metricType === "blood_glucose" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormInput label="Đường huyết" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
                  <FormSelect label="Bữa ăn" onChange={(value) => setMealContext(value as "fasting" | "after_meal" | "random")} options={mealContextOptions} value={mealContext} />
                </div>
              ) : null}
              {metricType === "spo2" || metricType === "body_temperature" ? (
                <FormInput label={metricType === "spo2" ? "SpO2" : "Thân nhiệt"} onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
              ) : null}
              {metricType === "weight" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormInput label="Cân nặng" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
                  <FormInput label="Chiều cao" onChange={(event) => setHeight(event.target.value)} type="number" value={height} />
                </div>
              ) : null}
              
              <FormInput label="Thiết bị" onChange={(event) => setDeviceName(event.target.value)} value={deviceName} />
              <FormInput label="Ghi chú" onChange={(event) => setManualNotes(event.target.value)} value={manualNotes} />
              <div className="flex items-end pt-2">
                <Button className="w-full" disabled={isCreatingManual} leftIcon={<Plus className="h-4 w-4" />} type="submit">
                  Thêm chỉ số nhập tay
                </Button>
              </div>
            </form>
          </Card>

          <Card padding="lg" className="h-full">
            <h2 className="text-lg font-semibold text-secondary mb-4">Lịch sử chỉ số</h2>
            <DataTable columns={timelineColumns} emptyDescription="Chưa có chỉ số nào." emptyTitle="Chưa có dữ liệu" getRowKey={(row) => row.id} rows={timelineRows} />
          </Card>
        </section>

        {/* Row 2: Vitals Display Plots */}
        <section className="grid gap-6 md:grid-cols-2">
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-secondary">Nhịp tim và nhịp thở</h2>
            <div className="mt-4 h-72">
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
            <h2 className="text-lg font-semibold text-secondary">Bước chân</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="stepCount" fill="#0D9488" name="Bước chân" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
