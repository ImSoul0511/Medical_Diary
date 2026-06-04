export interface PatientPublicResponse {
  id: string;
  full_name: string;
  phone_number?: string;
}

export interface PatientProfileResponse {
  id: string;
  full_name: string;
  phone_number?: string;
  medical_summary?: string;
}

export interface RequestAccessRequest {
  patient_id: string;
  reason: string;
  requested_scope: string[];
}

export interface RequestAccessResponse {
  request_id: string;
  status: string;
  requested_at: string;
}