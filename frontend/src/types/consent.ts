export const CONSENT_SCOPES = [
  "blood_type",
  "allergies",
  "emergency_contact",
  "medical_records",
  "prescriptions",
  "diaries",
  "heart_rate",
  "step_count",
  "respiratory_rate",
  "manual_health_records",
] as const;

export type ConsentScope = (typeof CONSENT_SCOPES)[number];

export const HEALTH_METRIC_CONSENT_SCOPES = [
  "heart_rate",
  "step_count",
  "respiratory_rate",
] as const satisfies readonly ConsentScope[];

export function isConsentScope(value: unknown): value is ConsentScope {
  return typeof value === "string" && CONSENT_SCOPES.includes(value as ConsentScope);
}

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
  doctorSpecialty: string | null;
  doctorHospital: string | null;
  approvedScopes: ConsentScope[];
  grantedAt: string;
  expiresAt: string | null;
};

export type ConsentHistoryItem = {
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string | null;
  doctorHospital: string | null;
  scopes: ConsentScope[];
  grantedAt: string;
  expiresAt: string | null;
}

export type ConsentReviewForm = {
  action: "approved" | "rejected";
  approvedScopes: ConsentScope[];
  expiresInDays: string;
}

