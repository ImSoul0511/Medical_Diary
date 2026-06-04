export interface UserProfileResponse {
  id: string;
  full_name: string;
  gender: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact?: string;
  privacy_settings: {
    show_blood_type: boolean;
    show_allergies: boolean;
    show_emergency_contact: boolean;
  };
}

export interface UserProfileUpdateRequest {
  full_name?: string;
  gender?: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact?: string;
}

export interface PrivacyUpdateRequest {
  show_blood_type?: boolean;
  show_allergies?: boolean;
  show_emergency_contact?: boolean;
}

export interface AccessHistoryItem {
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