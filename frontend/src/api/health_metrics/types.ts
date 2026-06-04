export interface HealthMetricCreateRequest {
  heart_rate?: number;
  step_count?: number;
  respiratory_rate?: number;
  recorded_at: string;
}

export interface HealthMetricResponse {
  id: string;
  user_id: string;
  heart_rate?: number;
  step_count?: number;
  respiratory_rate?: number;
  recorded_at: string;
  created_at: string;
}