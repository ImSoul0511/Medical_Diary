export interface PendingDoctorResponse {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  license_number: string;
  certificate_url: string;
  registered_at: string;
  status: string;
}

export interface DoctorVerifyRequest {
  action: "approved" | "rejected";
  notes?: string | null;
}

export interface AuditLogItem {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  table_name: string;
  target_user_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  action?: string;
  user_id?: string;
  date_from?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
