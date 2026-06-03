/**
 * API Layer - Central Export
 * Provides clean access to all API endpoints
 */

export * from './types';
export { apiClient } from './apiClient';
export { authApi } from './authApi';
export { userApi } from './userApi';
export { diaryApi } from './diaryApi';
export { healthMetricsApi } from './healthMetricsApi';
export { prescriptionApi } from './prescriptionApi';
export { consentApi } from './consentApi';
export { medicalRecordApi } from './medicalRecordApi';

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
