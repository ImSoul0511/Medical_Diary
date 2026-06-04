export interface EmergencyTokenCreateRequest {
  ttl_minutes?: number | null;
}

export interface EmergencyTokenResponse {
  emergency_token: string;
  expires_at?: string | null;
}

export interface EmergencyTokenItem {
  id: string;
  token: string;
  expires_at?: string | null;
  is_expired: boolean;
  created_at: string;
}

export interface EmergencyTokenUpdateRequest {
  ttl_minutes?: number | null;
}

export interface EmergencyAccessResponse {
  full_name: string;
  blood_type?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
}

export interface EmergencyAccessLogItem {
  id: string;
  token_id: string;
  accessed_at: string;
}
