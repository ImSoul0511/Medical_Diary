export type Gender = "male" | "female" | "other";

export type PrivacySettings = {
  showBloodType: boolean;
  showAllergies: boolean;
  showEmergencyContact: boolean;
};

export type UserProfile = {
  id: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  phoneNumber: string;
  address: string;
  privacySettings: PrivacySettings;
};

export type AccessHistoryItem = {
  id: string;
  actorName: string;
  actorRole: "doctor" | "emergency" | "admin";
  action: string;
  accessedAt: string;
};

export type DoctorPublicProfile = {
  id: string;
  fullName: string;
  specialty: string;
  hospital: string;
  status: "approved" | "pending";
};
