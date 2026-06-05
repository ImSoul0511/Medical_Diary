export interface UserProfileResponse {
  id: string;
  full_name: string;
  gender: string;
  date_of_birth?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
  privacy_settings: {
    show_blood_type: boolean;
    show_allergies: boolean;
    show_emergency_contact: boolean;
  };
}

export interface UserProfileUpdateRequest {
  full_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
}

export interface PrivacyUpdateRequest {
  show_blood_type?: boolean;
  show_allergies?: boolean;
  show_emergency_contact?: boolean;
}

export interface AccessHistoryItem {
  id: string;
  doctor_name: string;
  action: string;
  data_type: string;
  accessed_at: string;
}

export interface DoctorPublicResponse {
  id: string;
  full_name: string;
  specialty: string;
  hospital: string;
}

export interface DoctorSearchRequest {
  name?: string;
  specialty?: string;
}
