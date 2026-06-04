import { create } from "zustand";
import { consentApi } from "../api/consent/consentApi";
import {
  mapAccessRequestDto,
  mapActivePermissionFromHistory,
  mapConsentHistoryItemDto,
  mapConsentReviewFormToDto,
} from "../mappers/consentMapper";
import type {
  AccessRequest,
  ActivePermission,
  ConsentHistoryItem,
  ConsentReviewForm,
  ConsentScope,
} from "../types/consent";
import { getErrorMessage } from "./storeUtils";

type ConsentStore = {
  pendingRequests: AccessRequest[];
  activePermissions: ActivePermission[];
  history: ConsentHistoryItem[];
  selectedScopes: ConsentScope[];
  isLoadingRequests: boolean;
  isLoadingHistory: boolean;
  reviewingRequestId: string | null;
  revokingDoctorId: string | null;
  error: string | null;
  loadAccessRequests: () => Promise<AccessRequest[]>;
  loadHistory: () => Promise<ConsentHistoryItem[]>;
  reviewAccessRequest: (requestId: string, form: ConsentReviewForm) => Promise<void>;
  approveRequest: (requestId: string, scopes: ConsentScope[], expiresInDays?: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  revokeDoctorPermission: (doctorId: string) => Promise<void>;
  setSelectedScopes: (scopes: ConsentScope[]) => void;
  clearError: () => void;
};

export const useConsentStore = create<ConsentStore>((set) => ({
  pendingRequests: [],
  activePermissions: [],
  history: [],
  selectedScopes: [],
  isLoadingRequests: false,
  isLoadingHistory: false,
  reviewingRequestId: null,
  revokingDoctorId: null,
  error: null,
  loadAccessRequests: async () => {
    set({ isLoadingRequests: true, error: null });
    try {
      const pendingRequests = (await consentApi.getAccessRequests()).map(mapAccessRequestDto);
      set({ pendingRequests, isLoadingRequests: false });
      return pendingRequests;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load access requests.");
      set({ isLoadingRequests: false, error: message });
      throw error;
    }
  },
  loadHistory: async () => {
    set({ isLoadingHistory: true, error: null });
    try {
      const history = (await consentApi.getConsentHistory()).map(mapConsentHistoryItemDto);
      set({
        history,
        activePermissions: history.map(mapActivePermissionFromHistory),
        isLoadingHistory: false,
      });
      return history;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load consent history.");
      set({ isLoadingHistory: false, error: message });
      throw error;
    }
  },
  reviewAccessRequest: async (requestId, form) => {
    set({ reviewingRequestId: requestId, error: null });
    try {
      await consentApi.reviewAccessRequest(requestId, mapConsentReviewFormToDto(form));
      set((state) => ({
        pendingRequests: state.pendingRequests.filter((request) => request.id !== requestId),
        reviewingRequestId: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to review access request.");
      set({ reviewingRequestId: null, error: message });
      throw error;
    }
  },
  approveRequest: async (requestId, scopes, expiresInDays = "30") => {
    set({ reviewingRequestId: requestId, error: null });
    try {
      await consentApi.reviewAccessRequest(
        requestId,
        mapConsentReviewFormToDto({
          action: "approved",
          approvedScopes: scopes,
          expiresInDays,
        }),
      );
      set((state) => ({
        pendingRequests: state.pendingRequests.filter((request) => request.id !== requestId),
        reviewingRequestId: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to approve access request.");
      set({ reviewingRequestId: null, error: message });
      throw error;
    }
  },
  rejectRequest: async (requestId) => {
    set({ reviewingRequestId: requestId, error: null });
    try {
      await consentApi.reviewAccessRequest(
        requestId,
        mapConsentReviewFormToDto({
          action: "rejected",
          approvedScopes: [],
          expiresInDays: "",
        }),
      );
      set((state) => ({
        pendingRequests: state.pendingRequests.filter((request) => request.id !== requestId),
        reviewingRequestId: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to reject access request.");
      set({ reviewingRequestId: null, error: message });
      throw error;
    }
  },
  revokeDoctorPermission: async (doctorId) => {
    set({ revokingDoctorId: doctorId, error: null });
    try {
      await consentApi.revokeDoctorPermission(doctorId);
      set((state) => ({
        activePermissions: state.activePermissions.filter(
          (permission) => permission.doctorId !== doctorId,
        ),
        revokingDoctorId: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to revoke doctor permission.");
      set({ revokingDoctorId: null, error: message });
      throw error;
    }
  },
  setSelectedScopes: (scopes) => set({ selectedScopes: scopes }),
  clearError: () => set({ error: null }),
}));
