import { apiClient } from '../apiClient';
import { NotificationResponse } from './types';

export const notificationsApi = {
  list: async (): Promise<NotificationResponse[]> => {
    const resp = await apiClient.get('/notifications');
    return resp.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`);
  },
};
