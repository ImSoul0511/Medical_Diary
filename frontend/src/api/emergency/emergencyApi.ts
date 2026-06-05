import { apiClient } from "../apiClient";
import type {
  EmergencyAccessLogItem,
  EmergencyAccessResponse,
  EmergencyTokenCreateRequest,
  EmergencyTokenItem,
  EmergencyTokenResponse,
  EmergencyTokenUpdateRequest,
} from "./types";

export const emergencyApi = {
  createToken: async (data: EmergencyTokenCreateRequest): Promise<EmergencyTokenResponse> => {
    const response = await apiClient.post<EmergencyTokenResponse>("/emergency/token", data);
    return response.data;
  },

  listTokens: async (): Promise<EmergencyTokenItem[]> => {
    const response = await apiClient.get<EmergencyTokenItem[]>("/emergency/tokens");
    return response.data;
  },

  getAccessHistory: async (): Promise<EmergencyAccessLogItem[]> => {
    const response = await apiClient.get<EmergencyAccessLogItem[]>("/emergency/tokens/history");
    return response.data;
  },

  updateToken: async (
    tokenId: string,
    data: EmergencyTokenUpdateRequest,
  ): Promise<EmergencyTokenItem> => {
    const response = await apiClient.patch<EmergencyTokenItem>(
      `/emergency/tokens/${tokenId}`,
      data,
    );
    return response.data;
  },

  revokeToken: async (tokenId: string): Promise<void> => {
    await apiClient.delete(`/emergency/tokens/${tokenId}`);
  },

  accessByToken: async (token: string): Promise<EmergencyAccessResponse> => {
    const response = await apiClient.get<EmergencyAccessResponse>(`/emergency/access/${token}`);
    return response.data;
  },
};
