export type ConsentScope =
  | "blood_type"
  | "allergies"
  | "emergency_contact"
  | "medical_records"
  | "prescriptions"
  | "diaries"
  | "heart_rate"
  | "step_count"
  | "respiratory_rate";

export type AccessRequestStatus = "pending" | "approved" | "rejected" | string;

export type AccessRequest = {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string | null;
  doctorHospital: string | null;
  reason: string;
  requestedScopes: ConsentScope[];
  requestedAt: string;
  status: AccessRequestStatus;
}

export type ActivePermission = {
  id: string;
  doctorId: string;
  doctorName: string;
  approvedScopes: ConsentScope[];
  grantedAt: string;
  expiresAt: string;
};

export type ConsentHistoryItem = {
  doctorId: string;
  doctorName: string;
  scopes: ConsentScope[];
  grantedAt: string;
  expiresAt: string;
}

export type ConsentReviewForm = {
  action: "approved" | "rejected";
  approvedScopes: ConsentScope[];
  expiresInDays: string;
}

