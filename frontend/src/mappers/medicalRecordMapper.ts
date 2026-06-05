import type { MedicalRecord, MedicalRecordForm } from "../types/medicalRecord";
import type { MedicalRecordCreateRequest } from "../api/medical_records/types";
import { asArray, asNullableString, asRecord, asString, compactPayload, emptyToNull } from "./common";

export function mapMedicalRecordDto(dto: unknown): MedicalRecord {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    patientId: asString(source.patient_id),
    doctorId: asString(source.doctor_id),
    patientName: asNullableString(source.patient_name),
    doctorName: asNullableString(source.doctor_name),
    doctorSpecialty: asNullableString(source.doctor_specialty),
    doctorHospital: asNullableString(source.doctor_hospital),
    diagnosis: asString(source.diagnosis),
    notes: asNullableString(source.notes),
    attachments: asArray<string>(source.attachments),
    createdAt: asString(source.created_at),
  };
}

export function mapMedicalRecordFormToDto(form: MedicalRecordForm): MedicalRecordCreateRequest {
  return {
    patient_id: form.patientId,
    diagnosis: form.diagnosis,
    notes: emptyToNull(form.notes),
    attachments: form.attachments ?? [],
  };
}
