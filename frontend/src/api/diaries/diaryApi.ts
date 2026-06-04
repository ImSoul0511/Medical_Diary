import { apiClient } from "../apiClient";
import type { DiaryCreateRequest, DiaryEntry, DiaryResponse } from "./types";

export const diaryApi = {
  create: async (data: DiaryCreateRequest): Promise<DiaryEntry> => {
    const response = await apiClient.post<DiaryEntry>("/diaries", data);
    return response.data;
  },

  list: async (patientId?: string): Promise<DiaryResponse[]> => {
    const response = await apiClient.get<DiaryResponse[]>("/diaries", {
      params: patientId ? { patient_id: patientId } : undefined,
    });
    return response.data;
  },

  delete: async (diaryId: string): Promise<void> => {
    await apiClient.delete(`/diaries/${diaryId}`);
  },
};
