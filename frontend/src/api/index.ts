/**
 * API Layer - Central Export
 * Provides clean access to all API endpoints
 */

export { apiClient } from './apiClient';
export { authApi } from './auth/authApi';
export { userApi } from './users/userApi';
export { diaryApi } from './diaries/diaryApi';
export { healthMetricsApi } from './health_metrics/healthMetricsApi';
export { prescriptionApi } from './prescriptions/prescriptionsApi';
export { consentApi } from './consent/consentApi';
export { medicalRecordApi } from './medical_records/medicalRecordApi';
export { emergencyApi } from './emergency/emergencyApi';
export { doctorsApi } from './doctors/doctorsApi';
export { adminApi } from './admin/adminApi';
export { notificationsApi } from './notifications/notificationsApi';

/**
 * Usage Example:
 *
 * import { authApi, userApi, loginResponse } from '@/api';
 *
 * // Login
 * const response = await authApi.login({ email: 'user@example.com', password: '...' });
 *
 * // Get user profile
 * const profile = await userApi.getProfile();
 *
 * // Create diary entry
 * const entry = await diaryApi.create({ content: '...' });
 *
 * // Get health metrics
 * const metrics = await healthMetricsApi.list();
 */
