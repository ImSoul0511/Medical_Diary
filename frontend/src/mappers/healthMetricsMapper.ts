import type {
  HealthMetric,
  HealthMetricFilters,
  HealthMetricForm,
  ManualHealthRecord,
  ManualHealthRecordFilters,
  ManualHealthRecordForm,
  MetricType,
} from "../types/healthMetrics";
import type {
  HealthMetricCreateRequest,
  HealthMetricListParams,
  ManualHealthRecordCreateRequest,
  ManualHealthRecordListParams,
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

function asMetricType(value: unknown): MetricType {
  if (
    value === "blood_pressure" ||
    value === "blood_glucose" ||
    value === "spo2" ||
    value === "body_temperature" ||
    value === "weight" ||
    value === "height"
  ) {
    return value;
  }
  return "blood_pressure";
}

function parseNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalPayloadNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapManualHealthRecordDto(dto: unknown): ManualHealthRecord {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    userId: asString(source.user_id),
    metricType: asMetricType(source.metric_type),
    metrics: asRecord(source.metrics),
    deviceName: asNullableString(source.device_name),
    notes: asNullableString(source.notes),
    recordedAt: asString(source.recorded_at),
    createdAt: asString(source.created_at),
  };
}

export function mapManualRecordFormToDto(
  form: ManualHealthRecordForm,
): ManualHealthRecordCreateRequest {
  let metrics: Record<string, unknown>;

  switch (form.metricType) {
    case "blood_pressure":
      metrics = compactPayload({
        systolic: parseNumber(form.systolic),
        diastolic: parseNumber(form.diastolic),
        pulse: parseOptionalPayloadNumber(form.pulse),
      });
      break;
    case "blood_glucose":
      metrics = {
        value: parseNumber(form.value),
        meal_context: form.mealContext ?? "random",
      };
      break;
    case "spo2":
    case "body_temperature":
      metrics = { value: parseNumber(form.value) };
      break;
    case "weight":
      metrics = compactPayload({
        value: parseNumber(form.value),
        height: parseOptionalPayloadNumber(form.height),
      });
      break;
    case "height":
      metrics = {
        value: parseNumber(form.value),
      };
      break;
    default:
      metrics = {};
  }

  return {
    metric_type: form.metricType,
    metrics,
    device_name: form.deviceName?.trim() || null,
    notes: form.notes?.trim() || null,
    recorded_at: form.recordedAt,
  };
}

export function mapManualHealthMetricFiltersToParams(
  filters?: ManualHealthRecordFilters,
): ManualHealthRecordListParams {
  return compactPayload({
    patient_id: asNullableString(filters?.patientId),
    metric_type: filters?.metricType || null,
    start: asNullableString(filters?.start),
    end: asNullableString(filters?.end),
  }) as ManualHealthRecordListParams;
}
