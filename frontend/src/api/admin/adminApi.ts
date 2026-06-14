import { apiClient } from "../apiClient";
import type {
  AuditLogItem,
  AuditLogQuery,
  DoctorVerifyRequest,
  PaginatedResponse,
  PendingDoctorResponse,
} from "./types";

type MessageResponse = {
  message: string;
};

export const adminApi = {
  listPendingDoctors: async (): Promise<PendingDoctorResponse[]> => {
    const response = await apiClient.get<PendingDoctorResponse[]>("/admin/doctors/pending");
    return response.data;
  },

  listDoctors: async (status?: string): Promise<PendingDoctorResponse[]> => {
    const response = await apiClient.get<PendingDoctorResponse[]>("/admin/doctors", {
      params: status ? { status } : {},
    });
    return response.data;
  },

  verifyDoctor: async (
    doctorId: string,
    data: DoctorVerifyRequest,
  ): Promise<MessageResponse> => {
    const response = await apiClient.patch<MessageResponse>(
      `/admin/doctors/${doctorId}/verify`,
      data,
    );
    return response.data;
  },

  getAuditLogs: async (
    params: AuditLogQuery = {},
  ): Promise<PaginatedResponse<AuditLogItem>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLogItem>>(
      "/admin/audit-logs",
      { params },
    );
    return response.data;
  },
};
