import { apiClient } from './apiClient';
import { MedicalRecord } from './types';

/**
 * Medical Records API endpoints
 */
export const medicalRecordApi = {
  /**
   * Create new medical record
   */
  create: async (data: Partial<MedicalRecord>): Promise<MedicalRecord> => {
    const response = await apiClient.post<MedicalRecord>('/medical-records', data);
    return response.data;
  },

  /**
   * Get list of user's medical records
   */
  list: async (limit?: number, offset?: number): Promise<MedicalRecord[]> => {
    const response = await apiClient.get<MedicalRecord[]>('/medical-records', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Get single medical record by ID
   */
  getById: async (id: string): Promise<MedicalRecord> => {
    const response = await apiClient.get<MedicalRecord>(`/medical-records/${id}`);
    return response.data;
  },

  /**
   * Update medical record
   */
  update: async (id: string, data: Partial<MedicalRecord>): Promise<MedicalRecord> => {
    const response = await apiClient.patch<MedicalRecord>(`/medical-records/${id}`, data);
    return response.data;
  },

  /**
   * Delete medical record
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/medical-records/${id}`);
  },

  /**
   * Upload file for medical record
   */
  uploadFile: async (file: File, recordId?: string): Promise<{ file_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (recordId) {
      formData.append('record_id', recordId);
    }

    const response = await apiClient.post<{ file_url: string }>(
      '/medical-records/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};
