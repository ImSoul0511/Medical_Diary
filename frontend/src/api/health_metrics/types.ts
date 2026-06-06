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
