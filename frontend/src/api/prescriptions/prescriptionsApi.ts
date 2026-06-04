import { apiClient } from '../apiClient';
import { 
  PrescriptionCreateRequest,
  PrescriptionItemCreateRequest,
  PrescriptionItemResponse,
  PrescriptionLogResponse,
  PrescriptionLogUpdateRequest,
  PrescriptionResponse,
 } from './types';

/**
 * Prescription API endpoints (aligned with backend/router.py)
 */
export const prescriptionApi = {
  // Get list of user's prescriptions
  list: async (): Promise<PrescriptionResponse[]> => {
    const response = await apiClient.get<PrescriptionResponse[]>('/prescriptions');
    return response.data;
  },

  // Get prescription logs (medication schedule)
  getLogs: async (prescriptionId: string): Promise<PrescriptionLogResponse[]> => {
    const response = await apiClient.get<PrescriptionLogResponse[]>('/prescription-logs', {
      params: { prescription_id: prescriptionId },
    });
    return response.data;
  },

  // Update prescription log status (PATCH /prescription-logs/{log_id})
  updateLogStatus: async (log_id: string, data: PrescriptionLogUpdateRequest): Promise<void> => {
    await apiClient.patch(`/prescription-logs/${log_id}`, data);
  },

  // Create a new prescription (POST /prescriptions)
  createPrescription: async (data: PrescriptionCreateRequest): Promise<PrescriptionResponse> => {
    const response = await apiClient.post<PrescriptionResponse>('/prescriptions', data);
    return response.data;
  },

  // Add medication item to existing prescription (POST /prescriptions/{id}/items)
  addPrescriptionItem: async (prescription_id: string, data: PrescriptionItemCreateRequest): Promise<PrescriptionItemResponse> => {
    const response = await apiClient.post<PrescriptionItemResponse>(`/prescriptions/${prescription_id}/items`, data);
    return response.data;
  },

  // Delete (soft) prescription (DELETE /prescriptions/{id})
  deletePrescription: async (prescription_id: string): Promise<void> => {
    await apiClient.delete(`/prescriptions/${prescription_id}`);
  },

  // Internal: send medication reminders (POST /prescriptions/internal/send-reminders)
  sendMedicationReminders: async (): Promise<void> => {
    await apiClient.post('/prescriptions/internal/send-reminders');
  },
};
