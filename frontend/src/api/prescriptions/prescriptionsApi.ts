import { apiClient } from "../apiClient";
import type {
  PrescriptionCreateRequest,
  PrescriptionItemCreateRequest,
  PrescriptionItemResponse,
  PrescriptionLogResponse,
  PrescriptionLogUpdateRequest,
  PrescriptionResponse,
} from "./types";

export const prescriptionApi = {
  list: async (): Promise<PrescriptionResponse[]> => {
    const response = await apiClient.get<PrescriptionResponse[]>("/prescriptions");
    return response.data;
  },

  listPatientPrescriptions: async (patientId: string): Promise<PrescriptionResponse[]> => {
    const response = await apiClient.get<PrescriptionResponse[]>(`/prescriptions/patient/${patientId}`);
    return response.data;
  },

  getLogs: async (prescriptionId: string): Promise<PrescriptionLogResponse[]> => {
    const response = await apiClient.get<PrescriptionLogResponse[]>("/prescription-logs", {
      params: { prescription_id: prescriptionId },
    });
    return response.data;
  },

  updateLogStatus: async (
    logId: string,
    data: PrescriptionLogUpdateRequest,
  ): Promise<PrescriptionLogResponse> => {
    const response = await apiClient.patch<PrescriptionLogResponse>(
      `/prescription-logs/${logId}`,
      data,
    );
    return response.data;
  },

  createPrescription: async (
    data: PrescriptionCreateRequest,
  ): Promise<PrescriptionResponse> => {
    const response = await apiClient.post<PrescriptionResponse>("/prescriptions", data);
    return response.data;
  },

  addPrescriptionItem: async (
    prescriptionId: string,
    data: PrescriptionItemCreateRequest,
  ): Promise<PrescriptionItemResponse> => {
    const response = await apiClient.post<PrescriptionItemResponse>(
      `/prescriptions/${prescriptionId}/items`,
      data,
    );
    return response.data;
  },

  deletePrescription: async (prescriptionId: string): Promise<void> => {
    await apiClient.delete(`/prescriptions/${prescriptionId}`);
  },
};
