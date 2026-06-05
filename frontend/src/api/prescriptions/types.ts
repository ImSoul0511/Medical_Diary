export interface CustomLogCreate {
  scheduled_date: string;
  scheduled_time: string;
}

export interface PrescriptionItemCreateRequest {
  medication_name: string;
  dosage: string;
  duration_days?: number;
  scheduled_times?: string[];
  start_date?: string;
  custom_logs?: CustomLogCreate[];
}

export interface PrescriptionCreateRequest {
  patient_id: string;
  notes?: string | null;
}

export interface PrescriptionItemResponse {
  id: string;
  medication_name: string;
  dosage: string;
  duration_days?: number | null;
  scheduled_times?: string[] | null;
  start_date?: string | null;
  status: "active" | "cancelled" | string;
}

export interface PrescriptionResponse {
  id: string;
  patient_id: string;
  patient_name?: string | null;
  doctor_id: string;
  doctor_name?: string | null;
  doctor_hospital?: string | null;
  doctor_specialty?: string | null;
  notes?: string | null;
  created_at: string;
  items: PrescriptionItemResponse[];
}

export interface PrescriptionLogResponse {
  id: string;
  prescription_item_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "untaken" | "taken" | "skipped";
  taken_at?: string | null;
}

export interface PrescriptionLogUpdateRequest {
  status: "untaken" | "taken" | "skipped";
}
