import type { MedicalRecord, MedicalRecordForm, PatientDocument } from "../types/medicalRecord";
import type { MedicalRecordCreateRequest, PatientDocumentResponse } from "../api/medical_records/types";
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

export function mapPatientDocumentDto(dto: unknown): PatientDocument {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    patientId: asString(source.patient_id),
    fileName: asString(source.file_name),
    filePath: asString(source.file_path),
    fileSize: Number(source.file_size),
    mimeType: asNullableString(source.mime_type),
    downloadUrl: asNullableString(source.download_url),
    createdAt: asString(source.created_at),
  };
}

