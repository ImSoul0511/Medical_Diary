import type { ConsentScope } from "../../types/consent";

export interface ConsentHistoryItem {
  doctor_id: string;
  doctor_name: string;
  scope: ConsentScope[];
  granted_at: string;
  expires_at?: string | null;
}

export interface AccessRequestItem {
  request_id: string;
  doctor_id: string;
  doctor_name: string;
  requested_scope: ConsentScope[];
  reason: string;
  status: string;
  requested_at: string;
}

export interface AccessRequestActionRequest {
  action: "approved" | "rejected";
  approved_scope?: ConsentScope[];
  expires_in_days?: number | null;
}
