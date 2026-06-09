import { apiClient } from "../apiClient";
import type {
  HealthMetricCreateRequest,
  HealthMetricListParams,
  HealthMetricResponse,
  ManualHealthRecordCreateRequest,
  ManualHealthRecordListParams,
  ManualHealthRecordResponse,
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

  createManual: async (
    data: ManualHealthRecordCreateRequest,
  ): Promise<ManualHealthRecordResponse> => {
    const response = await apiClient.post<ManualHealthRecordResponse>(
      "/health-metrics/manual",
      data,
    );
    return response.data;
  },

  listManual: async (
    params?: ManualHealthRecordListParams,
  ): Promise<ManualHealthRecordResponse[]> => {
    const response = await apiClient.get<ManualHealthRecordResponse[]>(
      "/health-metrics/manual",
      { params },
    );
    return response.data;
  },
};
