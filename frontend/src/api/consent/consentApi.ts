import { apiClient } from '../apiClient';
import { 
  AccessRequestActionRequest,
  AccessRequestItem,
  ConsentHistoryItem, } from './types';

/**
 * Consent & Access Control API endpoints
 */
export const consentApi = {
  /**
   * Get list of pending access requests
   */
  getAccessRequests: async (): Promise<AccessRequestItem[]> => {
    const response = await apiClient.get<AccessRequestItem[]>('/consent/access-requests');
    return response.data;
  },

  /**
   * Review (approve/deny) a specific access request — backend expects PATCH
   */
  reviewAccessRequest: async (data: AccessRequestActionRequest): Promise<any> => {
    const response = await apiClient.patch('/consent/access-requests/review', data);
    return response.data;
  },  

  revokeDoctorPermission: async (doctor_id: string): Promise<any> => {
    const response = await apiClient.post(`/consent/${doctor_id}`);
    return response.data;
  },

  /**
   * Get consent history
   */
  getConsentHistory: async (): Promise<ConsentHistoryItem[]> => {
    const response = await apiClient.get<ConsentHistoryItem[]>('/consent/history');
    return response.data;
  },

  
};
