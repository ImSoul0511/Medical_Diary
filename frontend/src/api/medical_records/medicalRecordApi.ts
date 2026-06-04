import { apiClient } from '../apiClient';
import { 
  MedicalRecordCreateRequest,
  MedicalRecordResponse
 } from './types';

/**
 * Medical Records API endpoints
 */
export const medicalRecordApi = {
  /**
   * Create new medical record
   */
  create: async (data: MedicalRecordCreateRequest): Promise<MedicalRecordResponse> => {
    const response = await apiClient.post<MedicalRecordResponse>('/medical-records', data);
    return response.data;
  },
  /**
   * Get list of user's medical records
   */
  list: async (): Promise<MedicalRecordResponse[]> => {
    const response = await apiClient.get<MedicalRecordResponse[]>('/medical-records/me');
    return response.data;
  },

  /**
   * Get list of patient's medical records (for doctors)
   */
  listPatientRecords: async (patient_id: string): Promise<MedicalRecordResponse[]> => {
    const response = await apiClient.get<MedicalRecordResponse[]>(`/medical-records/${patient_id}`);
    return response.data;
  },

};
