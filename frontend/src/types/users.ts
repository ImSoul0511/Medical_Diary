export type Gender = "male" | "female";

export type PrivacySettings = {
  showBloodType: boolean;
  showAllergies: boolean;
  showEmergencyContact: boolean;
};

export type UserProfile = {
  id: string;
  email: string | null;
  fullName: string;
  gender: Gender | null;
  dateOfBirth: string | null; // Remove null later
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
  phoneNumber: string | null;
  cccd: string | null;
  privacySettings: PrivacySettings;
  specialty?: string | null;
  hospital?: string | null;
  certificateUrl?: string | null;
  verificationStatus?: string | null;
  verificationNotes?: string | null;
};

export type UserProfileForm = {
  password?: string;
  fullName: string; 
  gender: Gender | "";
  dateOfBirth: string | "";
  bloodType: string | "";
  allergies: string | "";
  emergencyContact: string | "";
  phoneNumber: string | "";
  cccd: string | "";
  specialty?: string;
  hospital?: string;
}

export type PrivateProfileForm = {
  password?: string;
  fullName: string;
  gender: Gender | "";
  dateOfBirth: string | "";
  phoneNumber: string | "";
  cccd: string | "";
  specialty?: string;
  hospital?: string;
};
export type AccessHistoryItem = {
  id: string;
  doctorName: string;
  action: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | string;
  dataType: string;
  accessedAt: string;
};

export type DoctorPublicProfile = {
  id: string;
  fullName: string;
  specialty: string;
  hospital: string;
};

