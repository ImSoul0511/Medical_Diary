import { apiClient } from '../apiClient';
import { 
    EmergencyAccessLogItem,
    EmergencyAccessResponse,
    EmergencyTokenCreateRequest,
    EmergencyTokenItem,
    EmergencyTokenResponse,
    EmergencyTokenUpdateRequest,
 } from './types';

export const emergencyApi = {
  createToken: async (data: EmergencyTokenCreateRequest): Promise<EmergencyTokenResponse> => {
    const resp = await apiClient.post('/emergency/token', data);
    return resp.data;
  },

  listTokens: async (): Promise<EmergencyTokenItem[]> => {
    const resp = await apiClient.get('/emergency/tokens');
    return resp.data;
  },

  getAccessHistory: async (): Promise<EmergencyAccessLogItem[]> => {
    const resp = await apiClient.get('/emergency/tokens/history');
    return resp.data;
  },

  updateToken: async (token_id: string, data: EmergencyTokenUpdateRequest): Promise<EmergencyTokenResponse> => {
    const resp = await apiClient.patch(`/emergency/tokens/${token_id}`, data);
    return resp.data;
  },

  revokeToken: async (token_id: string): Promise<void> => {
    await apiClient.delete(`/emergency/tokens/${token_id}`);
  },

  // Public access by token (no auth required)
  accessByToken: async (token: string): Promise<EmergencyAccessResponse> => {
    const resp = await apiClient.post(`/emergency/access/${token}`, { token });
    return resp.data;
  },
};
