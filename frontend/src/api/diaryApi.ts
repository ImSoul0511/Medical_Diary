import { apiClient } from './apiClient';
import { DiaryEntry, DiaryCreateRequest } from './types';

/**
 * Diary API endpoints
 */
export const diaryApi = {
  /**
   * Create new diary entry
   */
  create: async (data: DiaryCreateRequest): Promise<DiaryEntry> => {
    const response = await apiClient.post<DiaryEntry>('/diaries', data);
    return response.data;
  },

  /**
   * Get list of user's diary entries
   */
  list: async (limit?: number, offset?: number): Promise<DiaryEntry[]> => {
    const response = await apiClient.get<DiaryEntry[]>('/diaries', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Get single diary entry by ID
   */
  getById: async (id: string): Promise<DiaryEntry> => {
    const response = await apiClient.get<DiaryEntry>(`/diaries/${id}`);
    return response.data;
  },

  /**
   * Update diary entry
   */
  update: async (id: string, data: Partial<DiaryCreateRequest>): Promise<DiaryEntry> => {
    const response = await apiClient.patch<DiaryEntry>(`/diaries/${id}`, data);
    return response.data;
  },

  /**
   * Delete diary entry
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/diaries/${id}`);
  },
};
