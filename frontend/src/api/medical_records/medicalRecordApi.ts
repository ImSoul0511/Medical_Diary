import { apiClient } from "../apiClient";
import type { MedicalRecordCreateRequest, MedicalRecordResponse } from "./types";

export const medicalRecordApi = {
  create: async (data: MedicalRecordCreateRequest): Promise<MedicalRecordResponse> => {
    const response = await apiClient.post<MedicalRecordResponse>("/medical-records", data);
    return response.data;
  },

  list: async (): Promise<MedicalRecordResponse[]> => {
    const response = await apiClient.get<MedicalRecordResponse[]>("/medical-records/me");
    return response.data;
  },

  listPatientRecords: async (patientId: string): Promise<MedicalRecordResponse[]> => {
    const response = await apiClient.get<MedicalRecordResponse[]>(`/medical-records/${patientId}`);
    return response.data;
  },
};
