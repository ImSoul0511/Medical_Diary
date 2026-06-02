import { apiClient } from './axios';
import { UserProfile, UserProfileUpdateRequest, PrivacySettings, PrivacyUpdateRequest } from './types';

/**
 * User API endpoints
 */
export const userApi = {
  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/me');
    return response.data;
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: UserProfileUpdateRequest): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>('/users/me', data);
    return response.data;
  },

  /**
   * Get privacy settings
   */
  getPrivacySettings: async (): Promise<PrivacySettings> => {
    const response = await apiClient.get<PrivacySettings>('/users/privacy');
    return response.data;
  },

  /**
   * Update privacy settings
   */
  updatePrivacySettings: async (data: PrivacyUpdateRequest): Promise<PrivacySettings> => {
    const response = await apiClient.patch<PrivacySettings>('/users/privacy', data);
    return response.data;
  },

  /**
   * Export user data (JSON or PDF)
   */
  exportData: async (format: 'json' | 'pdf' = 'json'): Promise<Blob> => {
    const response = await apiClient.get('/users/me/export', {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get list of public doctors
   */
  getPublicDoctors: async (limit?: number): Promise<any[]> => {
    const response = await apiClient.get('/users/doctors', {
      params: { limit },
    });
    return response.data;
  },
};
