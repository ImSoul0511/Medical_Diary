import { apiClient } from "../apiClient";
import type { HealthMetricCreateRequest, HealthMetricResponse } from "./types";

export const healthMetricsApi = {
  create: async (data: HealthMetricCreateRequest): Promise<HealthMetricResponse> => {
    const response = await apiClient.post<HealthMetricResponse>("/health-metrics", data);
    return response.data;
  },

  list: async (
    start?: string,
    end?: string,
    patientId?: string,
  ): Promise<HealthMetricResponse[]> => {
    const response = await apiClient.get<HealthMetricResponse[]>("/health-metrics", {
      params: { patient_id: patientId, start, end },
    });
    return response.data;
  },
};
