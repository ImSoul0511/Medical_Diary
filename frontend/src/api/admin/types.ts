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
  notes?: string;
  action: 'approved' | 'rejected';
}

export interface AuditLogItem {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  table_name: string;
  target_name: string;
  target_user_id?: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
}
