export type DoctorApprovalStatus = "pending_verification" | "approved" | "rejected" | string;

export type DoctorApproval = {
  id: string;
  fullName: string;
  email: string;
  specialty: string;
  hospital: string | null;
  licenseNumber: string;
  certificateUrl: string | null;
  registeredAt: string;
  status: DoctorApprovalStatus;
}

export type DoctorVerifyForm = {
  action: "approved" | "rejected" | "pending_verification";
  note: string;
}

export type AuditLog = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  tableName: string;
  targetUserId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

export type AuditLogFilters = {
  page: number;
  limit: number;
  action?: string;
  userId?: string;
  dateFrom?: string;
}

