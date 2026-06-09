import {
  isConsentScope,
  type AccessRequest,
  type ActivePermission,
  type ConsentHistoryItem,
  type ConsentReviewForm,
  type ConsentScope,
} from "../types/consent";
import type { AccessRequestActionRequest } from "../api/consent/types";
import { asArray, asNullableString, asRecord, asString } from "./common";

function mapScopes(value: unknown): ConsentScope[] {
  return asArray<unknown>(value).filter(isConsentScope);
}

export function mapAccessRequestDto(dto: unknown): AccessRequest {
  const source = asRecord(dto);

  return {
    id: asString(source.request_id ?? source.id),
    doctorId: asString(source.doctor_id),
    doctorName: asString(source.doctor_name),
    doctorSpecialty: asNullableString(source.doctor_specialty),
    doctorHospital: asNullableString(source.doctor_hospital),
    reason: asString(source.reason),
    requestedScopes: mapScopes(source.requested_scope ?? source.requested_scopes),
    requestedAt: asString(source.requested_at),
    status: asString(source.status, "pending"),
  };
}

export function mapConsentHistoryItemDto(dto: unknown): ConsentHistoryItem {
  const source = asRecord(dto);

  return {
    doctorId: asString(source.doctor_id),
    doctorName: asString(source.doctor_name),
    doctorSpecialty: asNullableString(source.doctor_specialty),
    doctorHospital: asNullableString(source.doctor_hospital),
    scopes: mapScopes(source.scope ?? source.scopes),
    grantedAt: asString(source.granted_at),
    expiresAt: asNullableString(source.expires_at),
  };
}

export function mapActivePermissionFromHistory(item: ConsentHistoryItem): ActivePermission {
  return {
    id: `${item.doctorId}-${item.grantedAt}`,
    doctorId: item.doctorId,
    doctorName: item.doctorName,
    doctorSpecialty: item.doctorSpecialty,
    doctorHospital: item.doctorHospital,
    approvedScopes: item.scopes,
    grantedAt: item.grantedAt,
    expiresAt: item.expiresAt,
  };
}

export function mapConsentReviewFormToDto(form: ConsentReviewForm): AccessRequestActionRequest {
  const expiresInDays = form.expiresInDays.trim() ? Number(form.expiresInDays) : null;

  return {
    action: form.action,
    approved_scope: form.action === "approved" ? form.approvedScopes : undefined,
    expires_in_days: Number.isFinite(expiresInDays) ? expiresInDays : null,
  };
}
