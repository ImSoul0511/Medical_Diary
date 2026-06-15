export interface MedicalRecordCreateRequest {
  patient_id: string;
  diagnosis: string;
  notes?: string | null;
  attachments?: string[];
}

export interface MedicalRecordResponse {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name?: string | null;
  doctor_name?: string | null;
  doctor_specialty?: string | null;
  doctor_hospital?: string | null;
  diagnosis: string;
  notes?: string | null;
  attachments?: string[];
  created_at: string;
}

export interface PatientDocumentResponse {
  id: string;
  patient_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string | null;
  download_url?: string | null;
  created_at: string;
}

