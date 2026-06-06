import type { ConsentScope } from "../../types/consent";

export interface PatientPublicResponse {
  id: string;
  full_name: string;
  gender: string;
}

export interface PatientProfileResponse {
  full_name: string;
  gender: string;
  date_of_birth?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
}

export interface RequestAccessRequest {
  patient_id: string;
  reason: string;
  requested_scope: ConsentScope[];
}

export interface RequestAccessResponse {
  request_id: string;
  status: string;
  created_at: string;
}
