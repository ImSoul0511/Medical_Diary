/**
 * Tệp: frontend/src/api/axios.ts
 * Mục đích: Cấu hình client axios trung tâm với interceptor cho request/response.
 * - Gắn header `Authorization` lấy từ `useAuthStore`.
 * - Xử lý 401/403 ở chỗ chung (logout/redirect).
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Request Interceptor: Attach JWT token
   */
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = useAuthStore.getState().accessToken;

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  /**
   * Response Interceptor: Handle token expiration and errors
   */
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: AxiosError) => {
      // Handle 401 Unauthorized (token expired or invalid)
      if (error.response?.status === 401) {
        // Clear auth state and redirect to login
        useAuthStore.getState().logoutMock();
        window.location.href = '/login';
      }

      // Handle 403 Forbidden (no permission)
      if (error.response?.status === 403) {
        console.error('Access denied:', error.response.data);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export const apiClient = createAxiosInstance();
