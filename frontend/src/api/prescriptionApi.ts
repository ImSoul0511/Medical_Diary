import { apiClient } from './axios';
import { Prescription } from './types';

/**
 * Prescription API endpoints
 */
export const prescriptionApi = {
  /**
   * Get list of user's prescriptions
   */
  list: async (): Promise<Prescription[]> => {
    const response = await apiClient.get<Prescription[]>('/prescriptions');
    return response.data;
  },

  /**
   * Get single prescription by ID
   */
  getById: async (id: string): Promise<Prescription> => {
    const response = await apiClient.get<Prescription>(`/prescriptions/${id}`);
    return response.data;
  },

  /**
   * Get prescription logs (medication schedule)
   */
  getLogs: async (prescriptionId: string): Promise<any[]> => {
    const response = await apiClient.get('/prescription-logs', {
      params: { prescription_id: prescriptionId },
    });
    return response.data;
  },

  /**
   * Mark medication as taken
   */
  markAsTaken: async (logId: string): Promise<void> => {
    await apiClient.post(`/prescription-logs/${logId}/mark-taken`);
  },

  /**
   * Mark medication as missed
   */
  markAsMissed: async (logId: string): Promise<void> => {
    await apiClient.post(`/prescription-logs/${logId}/mark-missed`);
  },
};
