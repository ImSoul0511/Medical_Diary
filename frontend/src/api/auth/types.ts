export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserBrief {
  id: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: UserBrief;
}

export interface RefreshResponse {
  access_token: string;
  token_type: "bearer";
}

export interface RegisterRequest {
  email: string;
  phone_number: string;
  password: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
}

export interface RegisterDoctorRequest extends RegisterRequest {
  cccd: string;
  license_number: string;
  specialty: string;
  hospital: string;
  certificate_file?: File | null;
}

export interface RegisterDoctorResponse {
  id: string;
  full_name: string;
  status: string;
  certificate_url: string;
}

export interface SessionResponse {
  session_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_agent: string;
  ip: string;
}

export interface SessionListResponse {
  sessions: SessionResponse[];
}

export interface RevokeSessionRequest {
  session_id: string;
  password: string;
}

export interface RevokeAllRequest {
  password: string;
}
