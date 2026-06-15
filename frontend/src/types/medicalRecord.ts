export type MedicalRecord = {
    id: string;
    patientId: string;
    doctorId: string;
    patientName: string | null;
    doctorName: string | null;
    doctorSpecialty: string | null;
    doctorHospital: string | null;
    diagnosis: string;
    notes: string | null;
    attachments: string[];
    createdAt: string;
};

export type MedicalRecordForm = {
    patientId: string;
    diagnosis: string;
    notes?: string;
    attachments?: string[];
}

export type PatientDocument = {
  id: string;
  patientId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  downloadUrl: string | null;
  createdAt: string;
};


