import { apiClient } from './axios';
import { AccessRequest, AccessRequestAction } from './types';

/**
 * Consent & Access Control API endpoints
 */
export const consentApi = {
  /**
   * Get list of pending access requests
   */
  getAccessRequests: async (): Promise<AccessRequest[]> => {
    const response = await apiClient.get<AccessRequest[]>('/consent/access-requests');
    return response.data;
  },

  /**
   * Approve or deny access request
   */
  respondToAccessRequest: async (data: AccessRequestAction): Promise<any> => {
    const response = await apiClient.post('/consent/respond-access-request', data);
    return response.data;
  },

  /**
   * Get consent history
   */
  getConsentHistory: async (): Promise<any[]> => {
    const response = await apiClient.get('/consent/history');
    return response.data;
  },

  /**
   * Approve specific access request
   */
  approveAccess: async (requestId: string, durationDays?: number): Promise<any> => {
    return consentApi.respondToAccessRequest({
      request_id: requestId,
      action: 'approve',
      duration_days: durationDays,
    });
  },

  /**
   * Deny specific access request
   */
  denyAccess: async (requestId: string): Promise<any> => {
    return consentApi.respondToAccessRequest({
      request_id: requestId,
      action: 'deny',
    });
  },
};
