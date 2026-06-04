import type {
  PatientProfile,
  PatientSearchResult,
  RequestAccessForm,
  RequestAccessResult,
} from "../types/doctor";
import { asNullableString, asRecord, asString, compactPayload } from "./common";

export function mapPatientSearchResultDto(dto: unknown): PatientSearchResult {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    fullName: asString(source.full_name),
    gender: asString(source.gender),
  };
}

export function mapPatientProfileDto(dto: unknown): PatientProfile {
  const source = asRecord(dto);

  return {
    fullName: asString(source.full_name),
    gender: asString(source.gender),
    dateOfBirth: asNullableString(source.date_of_birth),
    bloodType: asNullableString(source.blood_type),
    allergies: asNullableString(source.allergies),
    emergencyContact: asNullableString(source.emergency_contact),
  };
}

export function mapRequestAccessFormToDto(form: RequestAccessForm) {
  return compactPayload({
    patient_id: form.patientId,
    requested_scope: form.requestedScopes,
    reason: form.reason,
  });
}

export function mapRequestAccessResultDto(dto: unknown): RequestAccessResult {
  const source = asRecord(dto);

  return {
    requestId: asString(source.request_id),
    status: asString(source.status),
    createdAt: asString(source.created_at),
  };
}
