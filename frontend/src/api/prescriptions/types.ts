export interface CustomLogCreate {
  schedule_date: string;
  schedule_time: string;
}

export interface PrescriptionItemCreateRequest {
  medication_name: string;
  dosage: string;
  duration_days?: number;
  schedule_times?: string[];
  start_date?: string;
  custom_logs?: CustomLogCreate[];
}

export interface PrescriptionCreateRequest {
  patient_id: string;
  notes?: string;
}

export interface PrescriptionItemResponse {
  id: string;
  medication_name: string;
  dosage: string;
  duration_days?: number;
  schedule_times?: string[];
  start_date?: string;
  status: 'active' | 'cancelled';
}

export interface PrescriptionResponse {
  id: string;
  patient_id: string;
  doctor_id: string;
  notes?: string;
  created_at: string;
  items: PrescriptionItemResponse[];
}

export interface PrescriptionLogResponse {
  id: string;
  prescription_item_id: string;
  schedule_date: string;
  schedule_time: string;
  status: 'untaken' | 'taken' | 'skipped';
  taken_at?: string;
}

export interface PrescriptionLogUpdateRequest {
  status: 'untaken' | 'taken' | 'skipped';
}