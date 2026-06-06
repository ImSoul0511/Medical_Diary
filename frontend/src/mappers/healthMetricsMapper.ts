import type { HealthMetric, HealthMetricFilters, HealthMetricForm } from "../types/healthMetrics";
import type {
  HealthMetricCreateRequest,
  HealthMetricListParams,
} from "../api/health_metrics/types";
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

export function mapHealthMetricFormToDto(form: HealthMetricForm): HealthMetricCreateRequest {
  const payload: HealthMetricCreateRequest = {
    recorded_at: form.recordedAt,
  };
  const heartRate = parseOptionalNumber(form.heartRate);
  const stepCount = parseOptionalNumber(form.stepCount);
  const respiratoryRate = parseOptionalNumber(form.respiratoryRate);

  if (heartRate !== undefined) payload.heart_rate = heartRate;
  if (stepCount !== undefined) payload.step_count = stepCount;
  if (respiratoryRate !== undefined) payload.respiratory_rate = respiratoryRate;

  return payload;
}

export function mapHealthMetricFiltersToParams(filters?: HealthMetricFilters): HealthMetricListParams {
  return compactPayload({
    patient_id: asNullableString(filters?.patientId),
    start: asNullableString(filters?.start),
    end: asNullableString(filters?.end),
  }) as HealthMetricListParams;
}
