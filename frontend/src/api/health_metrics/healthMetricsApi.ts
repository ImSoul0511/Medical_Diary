import { apiClient } from '../apiClient';
import { 
  HealthMetricCreateRequest,
  HealthMetricResponse
} from './types';

/**
 * Health Metrics API endpoints
 */
export const healthMetricsApi = {
  /**
   * Record new health metric
   */
  create: async (data: HealthMetricCreateRequest): Promise<HealthMetricResponse> => {
    const response = await apiClient.post<HealthMetricResponse>('/health-metrics', data);
    return response.data;
  },

  /**
   * Get list of user's health metrics with optional date range
   */
  list: async (start_date?: string, end_date?: string): Promise<HealthMetricResponse[]> => {
    const response = await apiClient.get<HealthMetricResponse[]>('/health-metrics', {
      params: { start_date, end_date },
    });
    return response.data;
  },

};
