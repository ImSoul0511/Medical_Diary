/**
 * API Response Types & Schemas
 */

export interface ApiErrorResponse {
  error_code: string;
  message: string;
  request_id?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiErrorResponse;
  status: number;
}

/**
 * Auth Types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserBrief;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  phone_number: string;
  password: string;
  full_name: string;
  gender: string;
  date_of_birth: string; // ISO date
}

export interface RegisterResponse {
  message: string;
}

export interface UserBrief {
  id: string; // UUID
  role: 'user' | 'doctor' | 'admin';
}

/**
 * User Types
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  gender?: string;
  date_of_birth?: string;
  role: 'user' | 'doctor' | 'admin';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdateRequest {
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
}

export interface PrivacySettings {
  show_profile_publicly: boolean;
  allow_doctor_contact: boolean;
  allow_emergency_contact: boolean;
}

export interface PrivacyUpdateRequest extends Partial<PrivacySettings> {}

/**
 * Diary Types
 */
export interface DiaryEntry {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  symptom_level?: number; // 1-10
  mood?: string;
  created_at: string;
  updated_at: string;
}

export interface DiaryCreateRequest {
  title?: string;
  content: string;
  symptom_level?: number;
  mood?: string;
}

/**
 * Health Metrics Types
 */
export interface HealthMetric {
  id: string;
  user_id: string;
  heart_rate?: number;
  step_count?: number;
  respiratory_rate?: number;
  temperature?: number;
  blood_pressure?: string;
  recorded_at: string;
  created_at: string;
}

export interface HealthMetricCreateRequest {
  heart_rate?: number;
  step_count?: number;
  respiratory_rate?: number;
  temperature?: number;
  blood_pressure?: string;
}

/**
 * Prescription Types
 */
export interface Prescription {
  id: string;
  user_id: string;
  doctor_id: string;
  issue_date: string;
  expiry_date: string;
  items: PrescriptionItem[];
  notes?: string;
  created_at: string;
}

export interface PrescriptionItem {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

/**
 * Consent Types
 */
export interface AccessRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  scope: string[];
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  expires_at?: string;
}

export interface AccessRequestAction {
  request_id: string;
  action: 'approve' | 'deny';
  duration_days?: number;
}

/**
 * Common Pagination
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Medical Record Types
 */
export interface MedicalRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  file_url?: string;
  recorded_date: string;
  created_at: string;
}
