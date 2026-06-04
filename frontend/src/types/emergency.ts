export type EmergencyProfile = {
  fullName: string;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
}

export type EmergencyToken = {
  id: string;
  token: string;
  expiresAt: string;
  isExpired: boolean;
  createdAt: string;
}

export type EmergencyTokenCreateForm = {
  ttlMinutes: number | null;
}

export type EmergencyTokenUpdateForm = {
  ttlMinutes: number | null;
}

export type EmergencyAccessLog = {
  id: string;
  tokenId: string;
  accessedAt: string;
}