import type {
  Prescription,
  PrescriptionDraft,
  PrescriptionItem,
  PrescriptionItemDraft,
  PrescriptionLog,
  PrescriptionLogStatus,
} from "../types/prescriptions";
import { asArray, asNullableString, asNumberOrNull, asRecord, asString, compactPayload, emptyToNull } from "./common";

function mapLogStatus(value: unknown): PrescriptionLogStatus {
  return value === "taken" || value === "skipped" || value === "untaken" ? value : "untaken";
}

export function mapPrescriptionItemDto(dto: unknown): PrescriptionItem {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    medicationName: asString(source.medication_name),
    dosage: asString(source.dosage),
    durationDays: asNumberOrNull(source.duration_days),
    scheduledTimes: asArray<string>(source.scheduled_times),
    startDate: asNullableString(source.start_date),
    status: asString(source.status, "active"),
  };
}

export function mapPrescriptionDto(dto: unknown): Prescription {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    patientId: asString(source.patient_id),
    patientName: asNullableString(source.patient_name),
    doctorId: asString(source.doctor_id),
    doctorName: asNullableString(source.doctor_name),
    doctorHospital: asNullableString(source.doctor_hospital),
    doctorSpecialty: asNullableString(source.doctor_specialty),
    notes: asNullableString(source.notes),
    items: asArray<unknown>(source.items).map(mapPrescriptionItemDto),
    createdAt: asString(source.created_at),
  };
}

export function mapPrescriptionLogDto(dto: unknown): PrescriptionLog {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    prescriptionItemId: asString(source.prescription_item_id),
    scheduledDate: asString(source.scheduled_date),
    scheduledTime: asString(source.scheduled_time),
    status: mapLogStatus(source.status),
    takenAt: asNullableString(source.taken_at),
  };
}

export function mapPrescriptionDraftToDto(draft: PrescriptionDraft) {
  return compactPayload({
    patient_id: draft.patientId,
    notes: emptyToNull(draft.notes),
  });
}

export function mapPrescriptionItemDraftToDto(draft: PrescriptionItemDraft) {
  return compactPayload({
    medication_name: draft.medicationName,
    dosage: draft.dosage,
    duration_days: draft.durationDays > 0 ? draft.durationDays : undefined,
    scheduled_times: draft.scheduledTimes.length > 0 ? draft.scheduledTimes : undefined,
    start_date: emptyToNull(draft.startDate),
    custom_logs:
      draft.customLogs.length > 0
        ? draft.customLogs.map((log) => ({
            scheduled_date: log.scheduledDate,
            scheduled_time: log.scheduledTime,
          }))
        : undefined,
  });
}

export function mapPrescriptionLogStatusToDto(status: PrescriptionLogStatus) {
  return { status };
}
