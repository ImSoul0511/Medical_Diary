export type HealthMetric = {
  id: string;
  recordedAt: string;
  heartRate: number;
  stepCount: number;
  respiratoryRate: number;
  systolic: number;
  diastolic: number;
};

export type SymptomEntry = {
  name: string;
  severity: number;
};

export type DiaryEntry = {
  id: string;
  content: string;
  symptoms: SymptomEntry[];
  mood: "good" | "neutral" | "tired" | "bad";
  createdAt: string;
};

export type MedicalRecord = {
  id: string;
  title: string;
  doctorName: string;
  hospital: string;
  diagnosis: string;
  createdAt: string;
};

export type PrescriptionLogStatus = "untaken" | "taken" | "skipped";

export type PrescriptionLog = {
  id: string;
  prescriptionId: string;
  scheduledAt: string;
  medicineName: string;
  status: PrescriptionLogStatus;
};

export type PrescriptionItem = {
  id: string;
  name: string;
  dosage: string;
  schedule: string[];
  durationDays: number;
  note: string;
};

export type Prescription = {
  id: string;
  title: string;
  doctorName: string;
  createdAt: string;
  items: PrescriptionItem[];
};
