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

export type AccessRequest = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  reason: string;
  requestedScopes: ConsentScope[];
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
};

export type ActivePermission = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  approvedScopes: ConsentScope[];
  expiresAt: string;
};
