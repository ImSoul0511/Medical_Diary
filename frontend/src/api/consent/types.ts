export interface ConsentHistoryItem {
  doctor_id: string;
  doctor_name: string;
  scope: string[];
  granted_at: string;
  expires_at?: string;
}

export  interface AccessRequestItem {
  request_id: string;
  doctor_id: string;
  doctor_name: string;
  requested_scope: string[];
  reason: string;
  status: string;
  requested_at: string;
}

export interface AccessRequestActionRequest {
  action: 'approved' | 'rejected';
  approval_scope?: string[];
  expires_in_days?: number;
}