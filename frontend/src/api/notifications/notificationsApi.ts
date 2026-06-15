import { apiClient } from "../apiClient";
import type { NotificationResponse } from "./types";

type MessageResponse = {
  message: string;
};

export const notificationsApi = {
  list: async (): Promise<NotificationResponse[]> => {
    const response = await apiClient.get<NotificationResponse[]>("/notifications");
    return response.data;
  },

  markAsRead: async (id: string): Promise<MessageResponse> => {
    const response = await apiClient.patch<MessageResponse>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>("/notifications/read-all");
    return response.data;
  },
};
