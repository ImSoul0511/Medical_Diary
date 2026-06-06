import { apiClient } from "../apiClient";
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RegisterDoctorRequest,
  RegisterDoctorResponse,
  RegisterRequest,
  RevokeAllRequest,
  RevokeSessionRequest,
  SessionListResponse,
} from "./types";

type MessageResponse = {
  message: string;
};

function toDoctorFormData(data: RegisterDoctorRequest | FormData): FormData {
  if (data instanceof FormData) return data;

  const formData = new FormData();
  formData.append("email", data.email);
  formData.append("phone_number", data.phone_number);
  formData.append("password", data.password);
  formData.append("full_name", data.full_name);
  formData.append("date_of_birth", data.date_of_birth);
  formData.append("gender", data.gender);
  formData.append("cccd", data.cccd);
  formData.append("license_number", data.license_number);
  formData.append("specialty", data.specialty);
  formData.append("hospital", data.hospital);

  if (data.certificate_file) {
    formData.append("certificate_file", data.certificate_file);
  }

  return formData;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", data, {
      skipAuthRefresh: true,
      withCredentials: true,
    });
    return response.data;
  },

  refresh: async (): Promise<RefreshResponse> => {
    const response = await apiClient.post<RefreshResponse>("/auth/refresh", undefined, {
      skipAuthRefresh: true,
      withCredentials: true,
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>("/auth/register", data);
    return response.data;
  },

  registerDoctor: async (
    data: RegisterDoctorRequest | FormData,
  ): Promise<RegisterDoctorResponse> => {
    const response = await apiClient.post<RegisterDoctorResponse>(
      "/auth/register-doctor",
      toDoctorFormData(data),
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout", undefined, {
      skipAuthRefresh: true,
      withCredentials: true,
    });
  },

  getSessions: async (): Promise<SessionListResponse> => {
    const response = await apiClient.get<SessionListResponse>("/auth/sessions");
    return response.data;
  },

  revokeSession: async (data: RevokeSessionRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>("/auth/revoke-selected-session", data);
    return response.data;
  },

  revokeAllSessions: async (data: RevokeAllRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>("/auth/revoke-all", data);
    return response.data;
  },
};
