import type {
  AccessHistoryItem,
  DoctorPublicProfile,
  PrivacySettings,
  UserProfile,
  UserProfileForm,
  PrivateProfileForm,
} from "../types/users";
import type { PrivateProfileUpdateRequest } from "../api/users/types";
import { asNullableString, asRecord, asString, compactPayload, emptyToNull } from "./common";

export type UserProfileDto = {
  id?: string;
  email?: string | null;
  full_name?: string;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
  phone_number?: string | null;
  cccd?: string | null;
  privacy_settings?: {
    show_blood_type?: boolean;
    show_allergies?: boolean;
    show_emergency_contact?: boolean;
  };
  specialty?: string | null;
  hospital?: string | null;
  certificate_url?: string | null;
  verification_status?: string | null;
  verification_notes?: string | null;
};

export function mapUserProfileDto(dto: unknown): UserProfile {
  const source = asRecord(dto);
  const privacy = asRecord(source.privacy_settings);

  return {
    id: asString(source.id),
    email: asNullableString(source.email),
    fullName: asString(source.full_name),
    gender: source.gender === "male" || source.gender === "female" ? source.gender : null,
    dateOfBirth: asNullableString(source.date_of_birth),
    bloodType: asNullableString(source.blood_type),
    allergies: asNullableString(source.allergies),
    emergencyContact: asNullableString(source.emergency_contact),
    phoneNumber: asNullableString(source.phone_number),
    cccd: asNullableString(source.cccd),
    privacySettings: {
      showBloodType: privacy.show_blood_type === true,
      showAllergies: privacy.show_allergies === true,
      showEmergencyContact: privacy.show_emergency_contact === true,
    },
    specialty: asNullableString(source.specialty),
    hospital: asNullableString(source.hospital),
    certificateUrl: asNullableString(source.certificate_url),
    verificationStatus: asNullableString(source.verification_status),
    verificationNotes: asNullableString(source.verification_notes),
  };
}

export function mapPrivateProfileFormToDto(form: PrivateProfileForm): PrivateProfileUpdateRequest {
  return {
    password: form.password || undefined,
    ...compactPayload({
      full_name: emptyToNull(form.fullName),
      gender: form.gender || null,
      date_of_birth: emptyToNull(form.dateOfBirth),
      phone_number: emptyToNull(form.phoneNumber),
      cccd: emptyToNull(form.cccd),
      specialty: emptyToNull(form.specialty),
      hospital: emptyToNull(form.hospital),
    }),
  };
}

export function mapUserProfileFormToDto(form: UserProfileForm) {
  return compactPayload({
    password: form.password || undefined,
    full_name: emptyToNull(form.fullName),
    gender: form.gender || null,
    date_of_birth: emptyToNull(form.dateOfBirth),
    blood_type: emptyToNull(form.bloodType),
    allergies: emptyToNull(form.allergies),
    emergency_contact: emptyToNull(form.emergencyContact),
    phone_number: emptyToNull(form.phoneNumber),
    cccd: emptyToNull(form.cccd),
    specialty: emptyToNull(form.specialty),
    hospital: emptyToNull(form.hospital),
  });
}

export function mapPrivacySettingsToDto(settings: Partial<PrivacySettings>) {
  return compactPayload({
    show_blood_type: settings.showBloodType,
    show_allergies: settings.showAllergies,
    show_emergency_contact: settings.showEmergencyContact,
  });
}

export function mapAccessHistoryItemDto(dto: unknown): AccessHistoryItem {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    doctorName: asString(source.doctor_name),
    action: asString(source.action),
    dataType: asString(source.data_type),
    accessedAt: asString(source.accessed_at),
  };
}

export function mapDoctorPublicProfileDto(dto: unknown): DoctorPublicProfile {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    fullName: asString(source.full_name),
    specialty: asString(source.specialty),
    hospital: asString(source.hospital),
  };
}
