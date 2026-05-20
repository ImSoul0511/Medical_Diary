import { FormEvent, useState } from "react";
import { Activity, Footprints, HeartPulse, Plus, Wind } from "lucide-react";
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
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormInput } from "../../components/FormInput";
import { StatCard } from "../../components/StatCard";
import { useMedicalStore } from "../../store/medicalStore";
import { formatDate } from "../../utils/date";

export function HealthMetricsPage() {
  const healthMetrics = useMedicalStore((state) => state.healthMetrics);
  const addMetricLocal = useMedicalStore((state) => state.addMetricLocal);
  const [heartRate, setHeartRate] = useState(78);
  const [stepCount, setStepCount] = useState(7000);
  const [respiratoryRate, setRespiratoryRate] = useState(16);
  const [systolic, setSystolic] = useState(118);
  const [diastolic, setDiastolic] = useState(76);
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addMetricLocal({
      recordedAt: new Date().toISOString(),
      heartRate,
      stepCount,
      respiratoryRate,
      systolic,
      diastolic,
    });
  }

  return (
    <AppShell
      description="Nhập và xem chỉ số sức khỏe mock. Không gửi dữ liệu ra backend."
      role="user"
      title="Chỉ số sức khỏe"
    >
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={HeartPulse} label="Nhịp tim mới nhất" unit="bpm" value={`${latest.heartRate}`} />
          <StatCard icon={Footprints} label="Bước chân" tone="success" unit="bước" value={`${latest.stepCount}`} />
          <StatCard icon={Wind} label="Nhịp thở" tone="accent" unit="lần/phút" value={`${latest.respiratoryRate}`} />
          <StatCard icon={Activity} label="Huyết áp" tone="warning" unit="mmHg" value={`${latest.systolic}/${latest.diastolic}`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-secondary">Nhập chỉ số</h2>
            <p className="mt-1 text-sm text-mutedForeground">Action này thêm bản ghi vào local Zustand store.</p>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <FormInput label="Nhịp tim" onChange={(event) => setHeartRate(Number(event.target.value))} type="number" value={heartRate} />
              <FormInput label="Bước chân" onChange={(event) => setStepCount(Number(event.target.value))} type="number" value={stepCount} />
              <FormInput label="Nhịp thở" onChange={(event) => setRespiratoryRate(Number(event.target.value))} type="number" value={respiratoryRate} />
              <FormInput label="Huyết áp tâm thu" onChange={(event) => setSystolic(Number(event.target.value))} type="number" value={systolic} />
              <FormInput label="Huyết áp tâm trương" onChange={(event) => setDiastolic(Number(event.target.value))} type="number" value={diastolic} />
              <div className="flex items-end">
                <Button className="w-full" leftIcon={<Plus className="h-4 w-4" />} type="submit">
                  Thêm chỉ số
                </Button>
              </div>
            </form>
          </Card>

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
        </section>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-secondary">Bước chân</h2>
          <div className="mt-4 h-64">
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
      </div>
    </AppShell>
  );
}
