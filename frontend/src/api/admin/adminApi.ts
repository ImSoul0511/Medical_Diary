import { apiClient } from '../apiClient';
import { PendingDoctorResponse, DoctorVerifyRequest, AuditLogItem } from './types';

export const adminApi = {
	listPendingDoctors: async (): Promise<PendingDoctorResponse[]> => {
		const resp = await apiClient.get<PendingDoctorResponse[]>('/admin/doctors/pending');
		return resp.data;
	},

	verifyDoctor: async (doctor_id: string, data: DoctorVerifyRequest) => {
		const resp = await apiClient.patch(`/admin/doctors/${doctor_id}/verify`, data);
		return resp.data;
	},

	getAuditLogs: async (): Promise<AuditLogItem[]> => {
        const resp = await apiClient.get<AuditLogItem[]>('/admin/audit-logs');
        return resp.data;
    },
};
