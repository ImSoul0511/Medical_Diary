/**
 * Tệp: frontend/src/api/authApi.ts
 * Mục đích: Wrapper nhẹ cho các endpoint liên quan đến xác thực.
 * Xuất khẩu: `authApi` gồm `login`, `register`, `logout` và helper quản lý session.
 */

import { apiClient } from './apiClient';
import { LoginRequest, LoginResponse, RefreshResponse, RegisterRequest, RegisterResponse } from './types';

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials, {
      withCredentials: true,
    });
    return response.data;
  },

  /**
   * Register new user
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout', undefined, {
      skipAuthRefresh: true,
      withCredentials: true,
    });
  },

  /**
   * Refresh access token using the HttpOnly refresh cookie
   */
  refresh: async (): Promise<RefreshResponse> => {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh', undefined, {
      skipAuthRefresh: true,
      withCredentials: true,
    });
    return response.data;
  },

  /**
   * Get list of active sessions
   */
  getSessions: async (): Promise<any> => {
    const response = await apiClient.get('/auth/sessions');
    return response.data;
  },

  /**
   * Revoke specific session
   */
  revokeSession: async (sessionId: string, password: string): Promise<any> => {
    const response = await apiClient.post('/auth/revoke-selected-session', {
      session_id: sessionId,
      password,
    });
    return response.data;
  },

  /**
   * Revoke all sessions
   */
  revokeAllSessions: async (password: string): Promise<any> => {
    const response = await apiClient.post('/auth/revoke-all', { password });
    return response.data;
  },
};
