/**
 * Tệp: frontend/src/api/authApi.ts
 * Mục đích: Wrapper nhẹ cho các endpoint liên quan đến xác thực.
 * Xuất khẩu: `authApi` gồm `login`, `register`, `logout` và helper quản lý session.
 */

import { apiClient } from '../apiClient';
import { 
  LoginRequest, 
    LoginResponse, 
    RegisterRequest, 
    RegisterDoctorRequest,
    RegisterDoctorResponse,
    SessionListResponse,
    RevokeSessionRequest,
    RevokeAllRequest
} from './types';

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data, {
      withCredentials: true,
    });
    return response.data;
  },

  /**
   * Register new user
   */
  register: async (data: RegisterRequest): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  /**
   * Register new doctor (admin only)
   * Accepts either a FormData (with certificate file) or an object — converts to FormData.
   */
  registerDoctor: async (data: RegisterDoctorRequest | FormData): Promise<RegisterDoctorResponse> => {
    let formData: FormData;
    if (data instanceof FormData) {
      formData = data;
    } else {
      formData = new FormData();
      formData.append('email', data.email);
      formData.append('phone_number', data.phone_number);
      formData.append('password', data.password);
      formData.append('full_name', data.full_name);
      formData.append('gender', data.gender);
      formData.append('date_of_birth', data.date_of_birth);
      formData.append('specialty', data.specialty); 
      formData.append('license_number', data.license_number);
      // formData.append('certificate', data.certificate); // Nếu có file certificate
    }
    const response = await apiClient.post<RegisterDoctorResponse>('/auth/register-doctor', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
   
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout', undefined, {
      withCredentials: true,
    });
  },

  /**
   * Get list of active sessions
   */
  getSessions: async (): Promise<SessionListResponse> => {
    const response = await apiClient.get<SessionListResponse>('/auth/sessions', {
      withCredentials: true,
    });
    return response.data;
  },

  /**
   * Revoke specific session
   */
  revokeSession: async (data: RevokeSessionRequest): Promise<any> => {
    const response = await apiClient.post('/auth/revoke-selected-session', data, {
      withCredentials: true,
    });
    return response.data;
  },

  /**
   * Revoke all sessions
   */
  revokeAllSessions: async (data: RevokeAllRequest): Promise<any> => {
    const response = await apiClient.post('/auth/revoke-all', data, {
      withCredentials: true,
    });
    return response.data;
  },
};
