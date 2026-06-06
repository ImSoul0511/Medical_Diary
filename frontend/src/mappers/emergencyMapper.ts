import type {
  EmergencyAccessLog,
  EmergencyProfile,
  EmergencyToken,
  EmergencyTokenCreateForm,
  EmergencyTokenUpdateForm,
} from "../types/emergency";
import { asBoolean, asNullableString, asRecord, asString, compactPayload } from "./common";

export function mapEmergencyProfileDto(dto: unknown): EmergencyProfile {
  const source = asRecord(dto);

  return {
    fullName: asString(source.full_name),
    bloodType: asNullableString(source.blood_type),
    allergies: asNullableString(source.allergies),
    emergencyContact: asNullableString(source.emergency_contact),
  };
}

export function mapEmergencyTokenDto(dto: unknown): EmergencyToken {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    token: asString(source.token ?? source.emergency_token),
    expiresAt: asNullableString(source.expires_at) ?? "",
    isExpired: asBoolean(source.is_expired),
    createdAt: asString(source.created_at),
    showBloodType: asBoolean(source.show_blood_type),
    showAllergies: asBoolean(source.show_allergies),
    showEmergencyContact: asBoolean(source.show_emergency_contact),
  };
}

export function mapEmergencyAccessLogDto(dto: unknown): EmergencyAccessLog {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    tokenId: asString(source.token_id),
    accessedAt: asString(source.accessed_at),
  };
}

export function mapEmergencyTokenCreateFormToDto(form: EmergencyTokenCreateForm) {
  return compactPayload({
    ttl_minutes: form.ttlMinutes,
    show_blood_type: form.showBloodType,
    show_allergies: form.showAllergies,
    show_emergency_contact: form.showEmergencyContact,
  });
}

export function mapEmergencyTokenUpdateFormToDto(form: EmergencyTokenUpdateForm) {
  return compactPayload({
    ttl_minutes: form.ttlMinutes,
  });
}
