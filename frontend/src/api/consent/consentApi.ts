import { apiClient } from "../apiClient";
import type {
  AccessRequestActionRequest,
  AccessRequestItem,
  ConsentHistoryItem,
} from "./types";

type MessageResponse = {
  message: string;
};

export const consentApi = {
  getAccessRequests: async (): Promise<AccessRequestItem[]> => {
    const response = await apiClient.get<AccessRequestItem[]>("/consent/access-requests");
    return response.data;
  },

  reviewAccessRequest: async (
    requestId: string,
    data: AccessRequestActionRequest,
  ): Promise<MessageResponse> => {
    const response = await apiClient.patch<MessageResponse>(
      `/consent/access-requests/${requestId}`,
      data,
    );
    return response.data;
  },

  revokeDoctorPermission: async (doctorId: string): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/consent/revoke/${doctorId}`);
    return response.data;
  },

  getConsentHistory: async (): Promise<ConsentHistoryItem[]> => {
    const response = await apiClient.get<ConsentHistoryItem[]>("/consent/history");
    return response.data;
  },
};
