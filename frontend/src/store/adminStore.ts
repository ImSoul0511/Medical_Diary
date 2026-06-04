import { create } from "zustand";
import { mapAuditLogFiltersToParams, mapDoctorVerifyFormToDto } from "../mappers/adminMapper";
import type { AuditLog, AuditLogFilters, DoctorApproval, DoctorVerifyForm } from "../types/admin";
import type { PaginationState } from "../types/api";
import { apiWrapperMissing } from "./storeUtils";

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
    const error = apiWrapperMissing("loadPendingDoctors()");
    set({ isLoadingDoctors: false, error: error.message });
    throw error;
  },
  verifyDoctor: async (doctorId, form) => {
    mapDoctorVerifyFormToDto(form);
    const error = apiWrapperMissing(`verifyDoctor(${doctorId})`);
    set({ verifyingDoctorId: null, error: error.message });
    throw error;
  },
  loadAuditLogs: async (filters = {}) => {
    const auditFilters = { ...get().auditFilters, ...filters };
    mapAuditLogFiltersToParams(auditFilters);
    const error = apiWrapperMissing("loadAuditLogs(filters)");
    set({ auditFilters, isLoadingAuditLogs: false, error: error.message });
    throw error;
  },
  setAuditFilters: (filters) =>
    set((state) => ({
      auditFilters: { ...state.auditFilters, ...filters },
    })),
  clearError: () => set({ error: null }),
}));
