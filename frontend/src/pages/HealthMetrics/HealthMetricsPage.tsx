import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footprints, HeartPulse, Plus, Trash2, Wind } from "lucide-react";
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
import { Modal } from "../../components/Modal";
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
  { value: "height", label: "Chiều cao" },
  { value: "heart_rate", label: "Nhịp tim" },
  { value: "respiratory_rate", label: "Nhịp thở" },
  { value: "step_count", label: "Số bước chân" },
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
    case "blood_pressure": {
      const systolic = record.metrics.systolic ?? "--";
      const diastolic = record.metrics.diastolic ?? "--";
      const pulse = record.metrics.pulse ? ` (Mạch: ${record.metrics.pulse} bpm)` : "";
      return `Tâm thu: ${systolic} / Tâm trương: ${diastolic} mmHg${pulse}`;
    }
    case "blood_glucose": {
      const mealContext = record.metrics.meal_context === "fasting"
        ? " (Lúc đói)"
        : record.metrics.meal_context === "after_meal"
          ? " (Sau ăn)"
          : record.metrics.meal_context === "random"
            ? " (Ngẫu nhiên)"
            : "";
      return `${value ?? "--"} mg/dL${mealContext}`;
    }
    case "spo2":
      return `${value ?? "--"}%`;
    case "body_temperature":
      return `${value ?? "--"} °C`;
    case "weight": {
      const height = record.metrics.height ? ` (Chiều cao đi kèm: ${record.metrics.height} cm)` : "";
      return `${value ?? "--"} kg${height}`;
    }
    case "height":
      return `${value ?? "--"} cm`;
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
  height: "Chiều cao",
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
  notes?: string | null;
  deviceName?: string | null;
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

function calculateBMI(weightKg: number, heightCm: number) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

function getBMICategory(bmi: number) {
  if (bmi < 18.5) {
    return { label: "Cân nặng thấp (Gầy)", tone: "info" as const };
  } else if (bmi >= 18.5 && bmi < 25) {
    return { label: "Bình thường", tone: "success" as const };
  } else if (bmi >= 25 && bmi < 30) {
    return { label: "Thừa cân", tone: "pending" as const };
  } else {
    return { label: "Béo phì", tone: "emergency" as const };
  }
}

export function HealthMetricsPage() {
  const navigate = useNavigate();
  const healthMetrics = useHealthMetricsStore((state) => state.items);
  const manualItems = useHealthMetricsStore((state) => state.manualItems);
  const loadMine = useHealthMetricsStore((state) => state.loadMine);
  const loadManualMetrics = useHealthMetricsStore((state) => state.loadManualMetrics);
  const createMetric = useHealthMetricsStore((state) => state.createMetric);
  const isCreating = useHealthMetricsStore((state) => state.isCreating);
  const createManualMetric = useHealthMetricsStore((state) => state.createManualMetric);
  const deleteManualMetric = useHealthMetricsStore((state) => state.deleteManualMetric);
  const isCreatingManual = useHealthMetricsStore((state) => state.isCreatingManual);
  const error = useHealthMetricsStore((state) => state.error);

  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const handleDeleteManual = (id: string) => {
    setRecordToDelete(id);
  };

  const [metricType, setMetricType] = useState<string>("blood_pressure");
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

  // BMI Calculator State
  const [bmiWeight, setBmiWeight] = useState("");
  const [bmiHeight, setBmiHeight] = useState("");
  const [isSavingBmi, setIsSavingBmi] = useState(false);

  // Find latest weight and height from manual items
  const weightRecords = manualItems.filter(item => item.metricType === "weight");
  const heightRecords = manualItems.filter(item => item.metricType === "height");

  const latestWeightRecord = weightRecords.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  )[0];

  const latestHeightRecord = heightRecords.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  )[0];

  const latestWeight = latestWeightRecord ? (latestWeightRecord.metrics.value as number) : null;
  const latestHeight = latestHeightRecord
    ? (latestHeightRecord.metrics.value as number)
    : (latestWeightRecord ? (latestWeightRecord.metrics.height as number) : null);

  // Auto fill BMI inputs when latest metrics are loaded
  useEffect(() => {
    if (latestWeight && !bmiWeight) {
      setBmiWeight(String(latestWeight));
    }
    if (latestHeight && !bmiHeight) {
      setBmiHeight(String(latestHeight));
    }
  }, [latestWeight, latestHeight]);

  const bmiValue = (bmiWeight && bmiHeight) ? calculateBMI(Number(bmiWeight), Number(bmiHeight)) : null;
  const bmiCategory = bmiValue ? getBMICategory(bmiValue) : null;

  const handleSaveBmiMetrics = async () => {
    if (!bmiWeight || !bmiHeight) return;
    setIsSavingBmi(true);
    try {
      await createManualMetric({
        metricType: "weight",
        value: bmiWeight,
        recordedAt: new Date().toISOString(),
      });
      await createManualMetric({
        metricType: "height",
        value: bmiHeight,
        recordedAt: new Date().toISOString(),
      });
      await loadManualMetrics();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingBmi(false);
    }
  };

  // Group and aggregate healthMetrics by calendar date to avoid duplicate X-axis labels
  const groupedDataMap: Record<string, {
    dateStr: string;
    heartRates: number[];
    respiratoryRates: number[];
    steps: { time: number; count: number }[];
  }> = {};

  healthMetrics.forEach((metric) => {
    const dateKey = formatDate(metric.recordedAt, "yyyy-MM-dd");
    const displayDay = formatDate(metric.recordedAt, "dd/MM");
    if (!groupedDataMap[dateKey]) {
      groupedDataMap[dateKey] = {
        dateStr: displayDay,
        heartRates: [],
        respiratoryRates: [],
        steps: [],
      };
    }
    if (metric.heartRate != null) {
      groupedDataMap[dateKey].heartRates.push(metric.heartRate);
    }
    if (metric.respiratoryRate != null) {
      groupedDataMap[dateKey].respiratoryRates.push(metric.respiratoryRate);
    }
    if (metric.stepCount != null) {
      groupedDataMap[dateKey].steps.push({
        time: new Date(metric.recordedAt).getTime(),
        count: metric.stepCount,
      });
    }
  });

  const aggregatedChartData = Object.keys(groupedDataMap)
    .sort()
    .map((dateKey) => {
      const group = groupedDataMap[dateKey];
      const avgHeartRate = group.heartRates.length > 0
        ? Math.round(group.heartRates.reduce((sum, val) => sum + val, 0) / group.heartRates.length)
        : null;
      const avgRespiratoryRate = group.respiratoryRates.length > 0
        ? Math.round(group.respiratoryRates.reduce((sum, val) => sum + val, 0) / group.respiratoryRates.length)
        : null;
      const latestStep = group.steps.length > 0
        ? group.steps.sort((a, b) => b.time - a.time)[0].count
        : null;

      return {
        day: group.dateStr,
        heartRate: avgHeartRate,
        respiratoryRate: avgRespiratoryRate,
        stepCount: latestStep,
      };
    });

  // Default viewport size: 7 days. Allow sliding/paginating through epochs.
  const [chartPage, setChartPage] = useState(0);
  const pageSize = 7;
  const totalDays = aggregatedChartData.length;
  const maxPage = Math.max(0, Math.ceil(totalDays / pageSize) - 1);
  const endIndex = totalDays - chartPage * pageSize;
  const startIndex = Math.max(0, endIndex - pageSize);
  const chartData = aggregatedChartData.slice(startIndex, endIndex);

  useEffect(() => {
    void loadMine().catch(() => undefined);
    void loadManualMetrics().catch(() => undefined);
  }, [loadManualMetrics, loadMine]);

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (metricType === "heart_rate" || metricType === "respiratory_rate" || metricType === "step_count") {
      void createMetric({
        heartRate: metricType === "heart_rate" ? manualValue : "",
        stepCount: metricType === "step_count" ? manualValue : "",
        respiratoryRate: metricType === "respiratory_rate" ? manualValue : "",
        recordedAt: new Date(manualRecordedAt).toISOString(),
      })
        .then(() => {
          setManualValue("");
          setManualRecordedAt(nowInputValue());
        })
        .catch(() => undefined);
      return;
    }

    void createManualMetric({
      metricType: metricType as MetricType,
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

  const timelineRows: TimelineRow[] = manualItems
    .map((record) => ({
      id: record.id,
      source: "manual" as const,
      label: metricTypeOptions.find((option) => option.value === record.metricType)?.label ?? record.metricType,
      value: formatManualMetric(record),
      recordedAt: record.recordedAt,
      notes: record.notes,
      deviceName: record.deviceName,
    }))
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const timelineColumns: DataTableColumn<TimelineRow>[] = [
    { key: "label", header: "Chỉ số", className: "text-center", render: (row) => <span className="font-semibold text-secondary">{row.label}</span> },
    {
      key: "value",
      header: "Giá trị",
      className: "text-center",
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className="font-medium text-slate-800">{row.value}</span>
          {row.notes ? (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1 border border-amber-200/50 font-medium max-w-[200px] truncate" title={row.notes}>
              Ghi chú: {row.notes}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "deviceName",
      header: "Thiết bị",
      className: "text-center",
      render: (row) => (
        <span className="text-sm font-semibold text-slate-600 truncate max-w-[120px]" title={row.deviceName ?? "Không rõ"}>
          {row.deviceName || "--"}
        </span>
      ),
    },
    { key: "date", header: "Thời điểm", className: "text-center", render: (row) => formatDateTime(row.recordedAt) },
    {
      key: "actions",
      header: "Hành động",
      className: "text-center w-[80px]",
      render: (row) =>
        row.source === "manual" ? (
          <button
            onClick={() => handleDeleteManual(row.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="Xóa bản ghi"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null,
    },
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
          <StatCard icon={HeartPulse} label="Nhịp tim" unit="bpm" value={displayMetric(latest?.heartRate)} />
          <StatCard icon={Footprints} label="Bước chân" tone="success" unit="bước" value={displayMetric(latest?.stepCount)} />
          <StatCard icon={Wind} label="Nhịp thở" tone="accent" unit="lần/phút" value={displayMetric(latest?.respiratoryRate)} />
        </section>

        {/* Row 1: Forms side-by-side */}
        <section className="grid gap-6 md:grid-cols-2">
          <Card padding="lg" className="h-fit">
            <h2 className="text-lg font-semibold text-secondary">Chỉ số nhập tay</h2>
            <form className="mt-5 space-y-4" onSubmit={handleManualSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect label="Loại chỉ số" labelClassName="text-xs" onChange={(value) => setMetricType(value)} options={metricTypeOptions} value={metricType} />
                <FormInput label="Thời điểm đo" labelClassName="text-xs" onChange={(event) => setManualRecordedAt(event.target.value)} required type="datetime-local" value={manualRecordedAt} />
              </div>

              {metricType === "blood_pressure" ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <FormInput label="Tâm thu (mmHg)" labelClassName="text-[11px] font-semibold" onChange={(event) => setSystolic(event.target.value)} required type="number" value={systolic} />
                  <FormInput label="Tâm trương (mmHg)" labelClassName="text-[11px] font-semibold" onChange={(event) => setDiastolic(event.target.value)} required type="number" value={diastolic} />
                  <FormInput label="Mạch (nhịp/phút)" labelClassName="text-[11px] font-semibold" onChange={(event) => setPulse(event.target.value)} type="number" value={pulse} />
                </div>
              ) : null}
              {metricType === "blood_glucose" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormInput label="Đường huyết (mg/dL)" labelClassName="text-xs" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
                  <FormSelect label="Bữa ăn" labelClassName="text-xs" onChange={(value) => setMealContext(value as "fasting" | "after_meal" | "random")} options={mealContextOptions} value={mealContext} />
                </div>
              ) : null}
              {metricType === "spo2" || metricType === "body_temperature" ? (
                <FormInput label={metricType === "spo2" ? "SpO2 (%)" : "Thân nhiệt (°C)"} labelClassName="text-xs" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
              ) : null}
              {metricType === "weight" ? (
                <FormInput label="Cân nặng (kg)" labelClassName="text-xs" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
              ) : null}
              {metricType === "height" ? (
                <FormInput label="Chiều cao (cm)" labelClassName="text-xs" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
              ) : null}
              {metricType === "heart_rate" ? (
                <FormInput label="Nhịp tim (bpm)" labelClassName="text-xs" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
              ) : null}
              {metricType === "respiratory_rate" ? (
                <FormInput label="Nhịp thở (lần/phút)" labelClassName="text-xs" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
              ) : null}
              {metricType === "step_count" ? (
                <FormInput label="Số bước chân" labelClassName="text-xs" onChange={(event) => setManualValue(event.target.value)} required type="number" value={manualValue} />
              ) : null}

              {metricType !== "heart_rate" && metricType !== "respiratory_rate" && metricType !== "step_count" ? (
                <>
                  <FormInput label="Thiết bị" labelClassName="text-xs" onChange={(event) => setDeviceName(event.target.value)} value={deviceName} />
                  <FormInput label="Ghi chú" labelClassName="text-xs" onChange={(event) => setManualNotes(event.target.value)} value={manualNotes} />
                </>
              ) : null}
              <div className="flex items-end pt-2">
                <Button className="w-full" disabled={isCreatingManual || isCreating} leftIcon={<Plus className="h-4 w-4" />} type="submit">
                  Thêm chỉ số
                </Button>
              </div>
            </form>
          </Card>

          <Card padding="lg" className="h-fit">
            <h2 className="text-lg font-semibold text-secondary">Công cụ tính BMI (IBM)</h2>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Cân nặng (kg)"
                  onChange={(event) => setBmiWeight(event.target.value)}
                  type="number"
                  value={bmiWeight}
                  placeholder=""
                />
                <FormInput
                  label="Chiều cao (cm)"
                  onChange={(event) => setBmiHeight(event.target.value)}
                  type="number"
                  value={bmiHeight}
                  placeholder=""
                />
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
                {bmiValue !== null && bmiCategory ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-500">Chỉ số BMI (IBM):</span>
                      <span className="text-lg font-bold text-secondary">{bmiValue}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-500">Phân loại:</span>
                      <Badge tone={bmiCategory.tone}>{bmiCategory.label}</Badge>
                    </div>
                    <div className="border-t border-slate-200/50 my-1" />
                  </>
                ) : (
                  <div className="text-center py-0.5">
                    <span className="text-xs text-mutedForeground">Nhập cân nặng & chiều cao để xem kết quả BMI</span>
                  </div>
                )}

                {/* Progress indicator / Thang đo */}
                <div className="space-y-1 pt-1">
                  <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-sky-400" style={{ width: "17.5%" }} /> {/* 15-18.5 */}
                    <div className="h-full bg-emerald-500" style={{ width: "32.5%" }} /> {/* 18.5-25 */}
                    <div className="h-full bg-amber-500" style={{ width: "25%" }} /> {/* 25-30 */}
                    <div className="h-full bg-rose-500" style={{ width: "25%" }} /> {/* 30-35 */}

                    {bmiValue !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-slate-900 border border-white -ml-0.5 transition-all duration-300 shadow"
                        style={{ left: `${Math.min(Math.max(((bmiValue - 15) / 20) * 100, 0), 100)}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                    <span>15.0 (Gầy)</span>
                    <span>18.5</span>
                    <span>25.0</span>
                    <span>30.0 (Béo)</span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full"
                disabled={!bmiWeight || !bmiHeight || isSavingBmi}
                onClick={handleSaveBmiMetrics}
                variant="outline"
              >
                {isSavingBmi ? "Đang lưu..." : "Lưu nhanh cả 2 chỉ số"}
              </Button>
            </div>
          </Card>
        </section>

        {/* Row 2: History Timeline full width */}
        <Card padding="lg" className="w-full flex flex-col">
          <h2 className="text-lg font-semibold text-secondary mb-4">Lịch sử chỉ số</h2>
          <div className={`max-h-[240px] overflow-y-auto ${timelineRows.length === 0 ? "flex-1 flex flex-col justify-center" : ""}`}>
            <DataTable columns={timelineColumns} emptyDescription="Chưa có chỉ số nào." emptyTitle="Chưa có dữ liệu" getRowKey={(row) => row.id} rows={timelineRows} borderlessEmpty={true} />
          </div>
        </Card>

        {/* Row 2: Vitals Display Plots */}
        <div className="flex flex-col space-y-3">
          <section className="grid gap-6 md:grid-cols-2">
            <Card
              padding="lg"
              className="cursor-pointer hover:shadow-md transition-shadow duration-200"
              onClick={() => navigate("/chi-so-suc-khoe/phan-tich")}
            >
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

            <Card
              padding="lg"
              className="cursor-pointer hover:shadow-md transition-shadow duration-200"
              onClick={() => navigate("/chi-so-suc-khoe/phan-tich")}
            >
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

          {/* Navigation Controls for Daily Viewport */}
          {maxPage > 0 && (
            <div className="flex items-center justify-end gap-2 bg-slate-50 border border-slate-200/60 rounded-card p-2 shadow-sm">
              <Button
                size="sm"
                variant="outline"
                disabled={chartPage >= maxPage}
                onClick={(e) => {
                  e.stopPropagation();
                  setChartPage(prev => prev + 1);
                }}
              >
                &larr; Cũ hơn
              </Button>
              <span className="text-xs font-semibold text-secondary px-2">
                Trang {chartPage + 1} / {maxPage + 1} ({totalDays} ngày)
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={chartPage <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setChartPage(prev => prev - 1);
                }}
              >
                Mới hơn &rarr;
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={recordToDelete !== null}
        title="Xác nhận xóa"
        description="Bạn có chắc chắn muốn xóa bản ghi chỉ số này không? Thao tác này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy bỏ"
        confirmVariant="danger"
        onConfirm={async () => {
          if (recordToDelete) {
            try {
              await deleteManualMetric(recordToDelete);
            } catch (e) {
              console.error(e);
            } finally {
              setRecordToDelete(null);
            }
          }
        }}
        onClose={() => setRecordToDelete(null)}
      />
    </AppShell>
  );
}
