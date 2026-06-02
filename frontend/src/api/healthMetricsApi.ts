import { apiClient } from './axios';
import { HealthMetric, HealthMetricCreateRequest } from './types';

/**
 * Health Metrics API endpoints
 */
export const healthMetricsApi = {
  /**
   * Record new health metric
   */
  create: async (data: HealthMetricCreateRequest): Promise<HealthMetric> => {
    const response = await apiClient.post<HealthMetric>('/health-metrics', data);
    return response.data;
  },

  /**
   * Get list of user's health metrics with optional date range
   */
  list: async (start?: string, end?: string): Promise<HealthMetric[]> => {
    const response = await apiClient.get<HealthMetric[]>('/health-metrics', {
      params: { start, end },
    });
    return response.data;
  },

  /**
   * Get health metrics for specific date range
   */
  getByDateRange: async (startDate: string, endDate: string): Promise<HealthMetric[]> => {
    return healthMetricsApi.list(startDate, endDate);
  },

  /**
   * Get latest health metrics
   */
  getLatest: async (): Promise<HealthMetric | null> => {
    const metrics = await healthMetricsApi.list();
    return metrics.length > 0 ? metrics[0] : null;
  },
};
