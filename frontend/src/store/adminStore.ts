import { create } from "zustand";
import { adminApi } from "../api/admin/adminApi";
import {
  mapAuditLogDto,
  mapAuditLogFiltersToParams,
  mapDoctorApprovalDto,
  mapDoctorVerifyFormToDto,
  mapPaginationDto,
} from "../mappers/adminMapper";
import type { AuditLog, AuditLogFilters, DoctorApproval, DoctorVerifyForm } from "../types/admin";
import type { PaginationState } from "../types/api";
import { getErrorMessage } from "./storeUtils";

type AdminStore = {
  pendingDoctors: DoctorApproval[];
  auditLogs: AuditLog[];
  auditFilters: AuditLogFilters;
  pagination: PaginationState;
  isLoadingDoctors: boolean;
  isLoadingAuditLogs: boolean;
  verifyingDoctorId: string | null;
  error: string | null;
  loadPendingDoctors: () => Promise<DoctorApproval[]>;
  verifyDoctor: (doctorId: string, form: DoctorVerifyForm) => Promise<void>;
  loadAuditLogs: (filters?: Partial<AuditLogFilters>) => Promise<AuditLog[]>;
  setAuditFilters: (filters: Partial<AuditLogFilters>) => void;
  clear: () => void;
  clearError: () => void;
};

const defaultAuditFilters: AuditLogFilters = {
  page: 1,
  limit: 20,
};

export const useAdminStore = create<AdminStore>((set, get) => ({
  pendingDoctors: [],
  auditLogs: [],
  auditFilters: defaultAuditFilters,
  pagination: { page: 1, limit: 20, total: 0 },
  isLoadingDoctors: false,
  isLoadingAuditLogs: false,
  verifyingDoctorId: null,
  error: null,
  loadPendingDoctors: async () => {
    set({ isLoadingDoctors: true, error: null });
    try {
      const pendingDoctors = (await adminApi.listPendingDoctors()).map(mapDoctorApprovalDto);
      set({ pendingDoctors, isLoadingDoctors: false });
      return pendingDoctors;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load pending doctors.");
      set({ isLoadingDoctors: false, error: message });
      throw error;
    }
  },
  verifyDoctor: async (doctorId, form) => {
    set({ verifyingDoctorId: doctorId, error: null });
    try {
      await adminApi.verifyDoctor(doctorId, mapDoctorVerifyFormToDto(form));
      set((state) => ({
        pendingDoctors: state.pendingDoctors.filter((doctor) => doctor.id !== doctorId),
        verifyingDoctorId: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to verify doctor.");
      set({ verifyingDoctorId: null, error: message });
      throw error;
    }
  },
  loadAuditLogs: async (filters = {}) => {
    const auditFilters = { ...get().auditFilters, ...filters };
    set({ auditFilters, isLoadingAuditLogs: true, error: null });
    try {
      const response = await adminApi.getAuditLogs(mapAuditLogFiltersToParams(auditFilters));
      const auditLogs = response.items.map(mapAuditLogDto);
      set({
        auditLogs,
        pagination: mapPaginationDto(response),
        isLoadingAuditLogs: false,
      });
      return auditLogs;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load audit logs.");
      set({ isLoadingAuditLogs: false, error: message });
      throw error;
    }
  },
  setAuditFilters: (filters) =>
    set((state) => ({
      auditFilters: { ...state.auditFilters, ...filters },
    })),
  clear: () =>
    set({
      pendingDoctors: [],
      auditLogs: [],
      auditFilters: defaultAuditFilters,
      pagination: { page: 1, limit: 20, total: 0 },
      isLoadingDoctors: false,
      isLoadingAuditLogs: false,
      verifyingDoctorId: null,
      error: null,
    }),
  clearError: () => set({ error: null }),
}));
