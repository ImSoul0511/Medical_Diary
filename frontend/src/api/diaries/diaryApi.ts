import { apiClient } from '../apiClient';
import { DiaryEntry, DiaryCreateRequest, DiaryResponse } from './types';

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
  list: async (): Promise<DiaryResponse[]> => {
    const response = await apiClient.get<DiaryResponse[]>('/diaries');
    return response.data;
  },

  /**
   * Delete diary entry
   */
  delete: async (diary_id: string): Promise<void> => {
    await apiClient.delete(`/diaries/${diary_id}`);
  },
};
