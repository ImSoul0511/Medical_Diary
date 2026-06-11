import { HealthMetric } from "../types/healthMetrics";
import { formatDate } from "./date";

export function aggregateHealthMetrics(metrics: HealthMetric[]) {
  // Sort from oldest to newest to ensure proper chronological order in Recharts
  const sorted = [...metrics].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const groupedByDate: {
    [key: string]: {
      heartRates: number[];
      respiratoryRates: number[];
      stepCounts: number[];
      recordedAt: string;
    };
  } = {};

  sorted.forEach((metric) => {
    const dateStr = metric.recordedAt.split("T")[0]; // YYYY-MM-DD
    if (!groupedByDate[dateStr]) {
      groupedByDate[dateStr] = {
        heartRates: [],
        respiratoryRates: [],
        stepCounts: [],
        recordedAt: metric.recordedAt,
      };
    }
    if (metric.heartRate != null) {
      groupedByDate[dateStr].heartRates.push(metric.heartRate);
    }
    if (metric.respiratoryRate != null) {
      groupedByDate[dateStr].respiratoryRates.push(metric.respiratoryRate);
    }
    if (metric.stepCount != null) {
      groupedByDate[dateStr].stepCounts.push(metric.stepCount);
    }
  });

  return Object.keys(groupedByDate)
    .sort() // Sort YYYY-MM-DD ascending
    .map((dateStr) => {
      const group = groupedByDate[dateStr];
      const avgHeartRate = group.heartRates.length > 0
        ? Math.round(group.heartRates.reduce((a, b) => a + b, 0) / group.heartRates.length)
        : null;
      const avgRespiratoryRate = group.respiratoryRates.length > 0
        ? Math.round(group.respiratoryRates.reduce((a, b) => a + b, 0) / group.respiratoryRates.length)
        : null;
      const totalStepCount = group.stepCounts.length > 0
        ? group.stepCounts.reduce((a, b) => a + b, 0)
        : null;

      return {
        day: formatDate(group.recordedAt, "dd/MM"),
        heartRate: avgHeartRate,
        stepCount: totalStepCount,
        respiratoryRate: avgRespiratoryRate,
      };
    });
}
