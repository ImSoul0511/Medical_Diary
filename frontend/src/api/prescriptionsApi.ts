import { apiClient } from './axios';

export const prescriptionsApi = {
  list: async () => {
    const resp = await apiClient.get('/prescriptions');
    return resp.data;
  },
  create: async (payload: any) => {
    const resp = await apiClient.post('/prescriptions', payload);
    return resp.data;
  },
  updateLog: async (logId: string, status: string) => {
    const resp = await apiClient.post(`/prescriptions/logs/${logId}`, { status });
    return resp.data;
  },
};
