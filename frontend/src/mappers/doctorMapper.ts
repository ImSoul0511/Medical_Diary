import type {
  PatientProfile,
  PatientSearchResult,
  ManagedPatient,
  RequestAccessForm,
  RequestAccessResult,
} from "../types/doctor";
import type { RequestAccessRequest } from "../api/doctors/types";
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

export function mapManagedPatientDto(dto: unknown): ManagedPatient {
  const source = asRecord(dto);

  return {
    patientId: asString(source.patient_id),
    fullName: asString(source.full_name),
    gender: asString(source.gender),
    scopes: Array.isArray(source.scope) ? source.scope.filter((item): item is ManagedPatient["scopes"][number] => typeof item === "string") : [],
    grantedAt: asString(source.granted_at),
    expiresAt: asNullableString(source.expires_at),
    accessStatus: asString(source.access_status, "active"),
  };
}

export function mapRequestAccessFormToDto(form: RequestAccessForm): RequestAccessRequest {
  return {
    patient_id: form.patientId,
    requested_scope: form.requestedScopes,
    reason: form.reason,
  };
}

export function mapRequestAccessResultDto(dto: unknown): RequestAccessResult {
  const source = asRecord(dto);

  return {
    requestId: asString(source.request_id),
    status: asString(source.status),
    createdAt: asString(source.created_at),
  };
}
