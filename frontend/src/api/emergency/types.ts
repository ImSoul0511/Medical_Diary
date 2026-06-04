export interface EmergencyTokenCreateRequest {
  ttl_minutes?: number;
}

export interface EmergencyTokenResponse {
  emergency_token: string;
  expires_at?: string;
}

export interface EmergencyTokenItem {
  id: string;
  token: string;
  expires_at?: string;
  is_expired: boolean;
  created_at: string;
}

export interface EmergencyTokenUpdateRequest {
  ttl_minutes?: number;
}

export interface EmergencyAccessResponse {
  full_name: string;
  blood_type?: string;
  allergies?: string;
  emergency_contacts?: string;
}

export interface EmergencyAccessLogItem {
  id: string;
  token_id: string;
  accessed_at: string;
}