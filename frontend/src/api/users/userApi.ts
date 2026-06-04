import { apiClient } from '../apiClient';
import { 
  UserProfileResponse,
  UserProfileUpdateRequest,
  PrivacyUpdateRequest,
  AccessHistoryItem,
  DoctorPublicResponse
 } from './types';

/**
 * User API endpoints
 */
export const userApi = {
  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserProfileResponse> => {
    const response = await apiClient.get<UserProfileResponse>('/users/me');
    return response.data;
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: UserProfileUpdateRequest): Promise<UserProfileResponse> => {
    const response = await apiClient.patch<UserProfileResponse>('/users/me', data);
    return response.data;
  },

  /**
   * Update privacy settings
   */
  updatePrivacySettings: async (data: PrivacyUpdateRequest): Promise<UserProfileResponse> => {
    const response = await apiClient.patch<UserProfileResponse>('/users/privacy', data);
    return response.data;
  },

  /**
   * Export user data (JSON or PDF)
   */
  exportData: async (format: 'json' | 'pdf'): Promise<Blob> => {
    const response = await apiClient.get(`/users/me/export`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get access history for the current user
   */
  getAccessHistory: async (): Promise<AccessHistoryItem[]> => {
    const response = await apiClient.get<AccessHistoryItem[]>('/users/me/access-history');
    return response.data;
  },

  /**
   * Search for doctors by name or specialty
   */
  searchDoctors: async (query: string): Promise<DoctorPublicResponse[]> => {
    const response = await apiClient.get<DoctorPublicResponse[]>('/users/search-doctors', {
      params: { q: query },
    });
    return response.data;
  },
};
