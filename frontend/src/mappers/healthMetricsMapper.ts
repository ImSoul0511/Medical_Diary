import type { HealthMetric, HealthMetricFilters, HealthMetricForm } from "../types/healthMetrics";
import { asNullableString, asNumberOrNull, asRecord, asString, compactPayload } from "./common";

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function mapHealthMetricDto(dto: unknown): HealthMetric {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    userId: asString(source.user_id),
    heartRate: asNumberOrNull(source.heart_rate),
    stepCount: asNumberOrNull(source.step_count),
    respiratoryRate: asNumberOrNull(source.respiratory_rate),
    recordedAt: asString(source.recorded_at),
    createdAt: asString(source.created_at),
  };
}

export function mapHealthMetricFormToDto(form: HealthMetricForm) {
  return compactPayload({
    heart_rate: parseOptionalNumber(form.heartRate),
    step_count: parseOptionalNumber(form.stepCount),
    respiratory_rate: parseOptionalNumber(form.respiratoryRate),
    recorded_at: form.recordedAt,
  });
}

export function mapHealthMetricFiltersToParams(filters?: HealthMetricFilters) {
  return compactPayload({
    patient_id: asNullableString(filters?.patientId),
    start: asNullableString(filters?.start),
    end: asNullableString(filters?.end),
  });
}
