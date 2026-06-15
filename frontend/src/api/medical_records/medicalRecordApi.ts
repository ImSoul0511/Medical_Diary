import { apiClient } from "../apiClient";
import type { MedicalRecordCreateRequest, MedicalRecordResponse, PatientDocumentResponse } from "./types";

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

  uploadDocument: async (file: File): Promise<PatientDocumentResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<PatientDocumentResponse>("/medical-records/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  uploadAttachment: async (patientId: string, file: File): Promise<PatientDocumentResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<PatientDocumentResponse>(`/medical-records/upload-attachment/${patientId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  listMyDocuments: async (): Promise<PatientDocumentResponse[]> => {
    const response = await apiClient.get<PatientDocumentResponse[]>("/medical-records/documents/me");
    return response.data;
  },

  listPatientDocuments: async (patientId: string): Promise<PatientDocumentResponse[]> => {
    const response = await apiClient.get<PatientDocumentResponse[]>(`/medical-records/documents/patient/${patientId}`);
    return response.data;
  },

  deleteDocument: async (documentId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/medical-records/documents/${documentId}`);
    return response.data;
  },
};

