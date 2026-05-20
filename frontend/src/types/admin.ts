export type DoctorApproval = {
  id: string;
  fullName: string;
  specialty: string;
  hospital: string;
  licenseNumber: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
};

export type AuditLog = {
  id: string;
  actor: string;
  action: string;
  target: string;
  status: "success" | "warning" | "blocked";
  createdAt: string;
  details: Record<string, string>;
};
