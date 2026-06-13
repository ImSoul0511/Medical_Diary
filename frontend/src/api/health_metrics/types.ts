export interface HealthMetricCreateRequest {
  heart_rate?: number | null;
  step_count?: number | null;
  respiratory_rate?: number | null;
  recorded_at: string;
}

export interface HealthMetricListParams {
  patient_id?: string | null;
  start?: string | null;
  end?: string | null;
}

export interface HealthMetricResponse {
  id: string;
  user_id: string;
  heart_rate?: number | null;
  step_count?: number | null;
  respiratory_rate?: number | null;
  recorded_at: string;
  created_at: string;
}

export type MetricType =
  | "blood_pressure"
  | "blood_glucose"
  | "spo2"
  | "body_temperature"
  | "weight"
  | "height";

export interface BloodPressureMetrics {
  systolic: number;
  diastolic: number;
  pulse?: number | null;
}

export interface BloodGlucoseMetrics {
  value: number;
  meal_context: "fasting" | "after_meal" | "random";
}

export interface SpO2Metrics {
  value: number;
}

export interface BodyTemperatureMetrics {
  value: number;
}

export interface WeightMetrics {
  value: number;
  height?: number | null;
}

export interface ManualHealthRecordCreateRequest {
  metric_type: MetricType;
  metrics: Record<string, unknown>;
  device_name?: string | null;
  notes?: string | null;
  recorded_at: string;
}

export interface ManualHealthRecordListParams extends HealthMetricListParams {
  metric_type?: MetricType | null;
}

export interface ManualHealthRecordResponse {
  id: string;
  user_id: string;
  metric_type: MetricType;
  metrics: Record<string, unknown>;
  device_name?: string | null;
  notes?: string | null;
  recorded_at: string;
  created_at: string;
}
