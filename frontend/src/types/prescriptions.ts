export type PrescriptionLogStatus = "untaken" | "taken" | "skipped";

export type CustomPrescriptionLogDraft = {
    scheduledDate: string;
    scheduledTime: string;
}

export type PrescriptionItem = {
    id: string;
    medicationName: string;
    dosage: string;
    durationDays: number | null;
    scheduledTimes: string[]; // ISO 8601 time strings (e.g., "08:00", "20:00")
    startDate: string | null;
    status: "active" | "cancelled" | string;
}

export type Prescription = {
  id: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  doctorName: string | null;
  doctorHospital: string | null;
  doctorSpecialty: string | null;
  notes: string | null;
  items: PrescriptionItem[];
  createdAt: string;
}

export type PrescriptionLog = {
    id: string;
    prescriptionItemId: string;
    scheduledDate: string;
    scheduledTime: string;
    status: PrescriptionLogStatus;
    takenAt: string | null;
}

export type PrescriptionDraft = {
    patientId: string;
    notes: string;
}

export type PrescriptionItemDraft = {
    medicationName: string;
    dosage: string;
    durationDays: number;
    scheduledTimes: string[]; // ISO 8601 time strings (e.g., "08:00", "20:00")
    startDate: string; // ISO 8601 date string (e.g., "2024-01-01")
    customLogs: CustomPrescriptionLogDraft[]; // Optional custom logs for each scheduled time
}

