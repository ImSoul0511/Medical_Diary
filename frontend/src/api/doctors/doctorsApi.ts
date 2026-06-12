import { apiClient } from "../apiClient";
import type {
  PatientProfileResponse,
  PatientPublicResponse,
  ManagedPatientResponse,
  RequestAccessRequest,
  RequestAccessResponse,
} from "./types";

export const doctorsApi = {
  searchPatients: async (phoneNumber: string): Promise<PatientPublicResponse[]> => {
    const response = await apiClient.get<PatientPublicResponse[]>("/doctors/search-patients", {
      params: { phone_number: phoneNumber },
    });
    return response.data;
  },

  getPatientDetail: async (patientId: string): Promise<PatientProfileResponse> => {
    const response = await apiClient.get<PatientProfileResponse>(`/doctors/patients/${patientId}`);
    return response.data;
  },

  getPatientPublicProfile: async (patientId: string): Promise<PatientProfileResponse> => {
    const response = await apiClient.get<PatientProfileResponse>(`/doctors/patients/${patientId}/public`);
    return response.data;
  },

  listManagedPatients: async (): Promise<ManagedPatientResponse[]> => {
    const response = await apiClient.get<ManagedPatientResponse[]>("/doctors/patients");
    return response.data;
  },

  requestAccess: async (data: RequestAccessRequest): Promise<RequestAccessResponse> => {
    const response = await apiClient.post<RequestAccessResponse>("/doctors/request-access", data);
    return response.data;
  },
};
