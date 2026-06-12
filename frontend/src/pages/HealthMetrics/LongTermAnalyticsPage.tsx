import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Footprints, HeartPulse, Wind } from "lucide-react";
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
import { useHealthMetricsStore } from "../../store/healthMetricsStore";
import { formatDate } from "../../utils/date";

export function LongTermAnalyticsPage() {
  const navigate = useNavigate();
  const healthMetrics = useHealthMetricsStore((state) => state.items);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  // Group data based on selected view mode
  const aggregatedDataMap: Record<string, {
    label: string;
    heartRates: number[];
    respiratoryRates: number[];
    steps: number[];
  }> = {};

  healthMetrics.forEach((metric) => {
    const dateObj = new Date(metric.recordedAt);
    let groupKey = "";
    let displayLabel = "";

    if (viewMode === "month") {
      // Group by YYYY-MM
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      groupKey = `${year}-${month}`;
      displayLabel = `${month}/${year}`;
    } else {
      // Group by YYYY
      const year = dateObj.getFullYear();
      groupKey = String(year);
      displayLabel = `Năm ${year}`;
    }

    if (!aggregatedDataMap[groupKey]) {
      aggregatedDataMap[groupKey] = {
        label: displayLabel,
        heartRates: [],
        respiratoryRates: [],
        steps: [],
      };
    }

    if (metric.heartRate != null) {
      aggregatedDataMap[groupKey].heartRates.push(metric.heartRate);
    }
    if (metric.respiratoryRate != null) {
      aggregatedDataMap[groupKey].respiratoryRates.push(metric.respiratoryRate);
    }
    if (metric.stepCount != null) {
      aggregatedDataMap[groupKey].steps.push(metric.stepCount);
    }
  });

  const chartData = Object.keys(aggregatedDataMap)
    .sort()
    .map((key) => {
      const group = aggregatedDataMap[key];
      const avgHeartRate = group.heartRates.length > 0
        ? Math.round(group.heartRates.reduce((sum, v) => sum + v, 0) / group.heartRates.length)
        : 0;
      const avgRespiratoryRate = group.respiratoryRates.length > 0
        ? Math.round(group.respiratoryRates.reduce((sum, v) => sum + v, 0) / group.respiratoryRates.length)
        : 0;
      const avgSteps = group.steps.length > 0
        ? Math.round(group.steps.reduce((sum, v) => sum + v, 0) / group.steps.length)
        : 0;

      return {
        label: group.label,
        heartRate: avgHeartRate || null,
        respiratoryRate: avgRespiratoryRate || null,
        stepCount: avgSteps || null,
      };
    });

  return (
    <AppShell role="user" title="Phân tích xu hướng dài hạn">
      <div className="space-y-6 max-w-6xl">
        {/* Header navigation and controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-secondary transition shadow-sm"
              title="Quay lại"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-secondary">Biểu đồ xu hướng sức khỏe</h1>
              <p className="text-xs text-mutedForeground">Xem các dữ liệu tổng quan được tổng hợp theo tháng hoặc năm</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit self-start sm:self-center">
            <button
              onClick={() => setViewMode("month")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "month"
                  ? "bg-white text-secondary shadow-sm"
                  : "text-mutedForeground hover:text-secondary"
              }`}
            >
              Theo Tháng
            </button>
            <button
              onClick={() => setViewMode("year")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "year"
                  ? "bg-white text-secondary shadow-sm"
                  : "text-mutedForeground hover:text-secondary"
              }`}
            >
              Theo Năm
            </button>
          </div>
        </div>

        {/* Aggregate Overview Cards */}
        {chartData.length === 0 ? (
          <Card padding="lg" className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-mutedForeground mb-3" />
            <h3 className="text-sm font-semibold text-secondary">Không tìm thấy dữ liệu sức khỏe</h3>
            <p className="text-xs text-mutedForeground mt-1">Vui lòng đồng bộ hóa hoặc đo chỉ số sức khỏe của bạn để xem phân tích.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-6 md:grid-cols-2">
              <Card padding="lg">
                <div className="flex items-center gap-2 mb-4">
                  <HeartPulse className="h-5 w-5 text-emergency" />
                  <h2 className="text-base font-semibold text-secondary">
                    Xu hướng Nhịp tim (Trung bình {viewMode === "month" ? "Tháng" : "Năm"})
                  </h2>
                </div>
                <div className="h-80">
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} domain={["dataMin - 10", "dataMax + 10"]} />
                      <Tooltip />
                      <Line
                        dataKey="heartRate"
                        name="Nhịp tim trung bình"
                        stroke="#DC2626"
                        strokeWidth={2.5}
                        type="monotone"
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card padding="lg">
                <div className="flex items-center gap-2 mb-4">
                  <Wind className="h-5 w-5 text-accent" />
                  <h2 className="text-base font-semibold text-secondary">
                    Xu hướng Nhịp thở (Trung bình {viewMode === "month" ? "Tháng" : "Năm"})
                  </h2>
                </div>
                <div className="h-80">
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} domain={["dataMin - 3", "dataMax + 3"]} />
                      <Tooltip />
                      <Line
                        dataKey="respiratoryRate"
                        name="Nhịp thở trung bình"
                        stroke="#7C3AED"
                        strokeWidth={2.5}
                        type="monotone"
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </section>

            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <Footprints className="h-5 w-5 text-success" />
                <h2 className="text-base font-semibold text-secondary">
                  Số bước chân trung bình mỗi ngày ({viewMode === "month" ? "Tháng" : "Năm"})
                </h2>
              </div>
              <div className="h-80">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar
                      dataKey="stepCount"
                      fill="#0D9488"
                      name="Số bước trung bình"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
