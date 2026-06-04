import { apiClient } from '../apiClient';
import { 
    PatientProfileResponse,
    PatientPublicResponse,
    RequestAccessRequest,
    RequestAccessResponse,
 } from './types';

export const doctorsApi = {
  searchPatients: async (query: string) => {
    const resp = await apiClient.get('/doctors/search-patients', {
      params: { q: query },
    });
    return resp.data;
  },

  getPatientDetail: async (patient_id: string): Promise<PatientProfileResponse> => {
    const resp = await apiClient.get(`/doctors/patients/${patient_id}`);
    return resp.data;
  },

  requestAccess: async (data: RequestAccessRequest): Promise<RequestAccessResponse> => {
    const resp = await apiClient.post('/doctors/request-access', data);
    return resp.data;
  },
};
