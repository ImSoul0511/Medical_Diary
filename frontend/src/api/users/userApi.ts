import { apiClient } from "../apiClient";
import type {
  AccessHistoryItem,
  DoctorPublicResponse,
  DoctorSearchRequest,
  PrivacyUpdateRequest,
  PrivateProfileUpdateRequest,
  UserProfileResponse,
  UserProfileUpdateRequest,
} from "./types";

export const userApi = {
  getProfile: async (): Promise<UserProfileResponse> => {
    const response = await apiClient.get<UserProfileResponse>("/users/me");
    return response.data;
  },

  updateProfile: async (data: UserProfileUpdateRequest): Promise<UserProfileResponse> => {
    const response = await apiClient.patch<UserProfileResponse>("/users/me", data);
    return response.data;
  },

  updatePrivateProfile: async (data: PrivateProfileUpdateRequest): Promise<UserProfileResponse> => {
    const response = await apiClient.patch<UserProfileResponse>("/users/me/private", data);
    return response.data;
  },

  updatePrivacySettings: async (
    data: PrivacyUpdateRequest,
  ): Promise<Record<string, unknown>> => {
    const response = await apiClient.patch<Record<string, unknown>>("/users/privacy", data);
    return response.data;
  },

  exportData: async (format: "json" | "pdf", scope = "profile"): Promise<Blob> => {
    const response = await apiClient.get("/users/me/export", {
      params: { format, scope },
      responseType: "blob",
    });
    return response.data;
  },

  getAccessHistory: async (): Promise<AccessHistoryItem[]> => {
    const response = await apiClient.get<AccessHistoryItem[]>("/users/me/access-history");
    return response.data;
  },

  searchDoctors: async (
    filters: DoctorSearchRequest = {},
  ): Promise<DoctorPublicResponse[]> => {
    const response = await apiClient.get<DoctorPublicResponse[]>("/users/search-doctors", {
      params: filters,
    });
    return response.data;
  },
};
