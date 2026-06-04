export interface MedicalRecordCreateRequest {
  patent_id: string;
  diagnosis: string;
  notes?: string;
  attachments?: string[]; 
}

export interface MedicalRecordResponse {
  id: string;
  patent_id: string;
  doctor_id: string;
  diagnosis: string;
  notes?: string;
  attachments?: string[]; 
  created_at: string;
}