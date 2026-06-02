import { apiClient } from './axios';

export const medicalApi = {
  listMetrics: async () => {
    const resp = await apiClient.get('/medical/metrics');
    return resp.data;
  },
  createDiary: async (payload: any) => {
    const resp = await apiClient.post('/medical/diaries', payload);
    return resp.data;
  },
  listRecords: async () => {
    const resp = await apiClient.get('/medical/records');
    return resp.data;
  },
};
