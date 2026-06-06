import { apiClient } from "../apiClient";
import type {
  HealthMetricCreateRequest,
  HealthMetricListParams,
  HealthMetricResponse,
} from "./types";

export const healthMetricsApi = {
  create: async (data: HealthMetricCreateRequest): Promise<HealthMetricResponse> => {
    const response = await apiClient.post<HealthMetricResponse>("/health-metrics", data);
    return response.data;
  },

  list: async (params?: HealthMetricListParams): Promise<HealthMetricResponse[]> => {
    const response = await apiClient.get<HealthMetricResponse[]>("/health-metrics", {
      params,
    });
    return response.data;
  },
};
