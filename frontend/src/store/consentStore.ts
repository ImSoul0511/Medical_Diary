import { create } from "zustand";
import { mockAccessRequests, mockPermissions } from "../constants/mockData";
import type { ConsentScope } from "../types/consent";

type ConsentStore = {
  pendingRequests: typeof mockAccessRequests;
  activePermissions: typeof mockPermissions;
  selectedScopes: ConsentScope[];
  isLoading?: boolean;
  error?: string | null;
  setSelectedScopes: (scopes: ConsentScope[]) => void;
  approveRequestLocal: (requestId: string, scopes: ConsentScope[]) => void;
  rejectRequestLocal: (requestId: string) => void;
  revokeDoctorLocal: (doctorId: string) => void;
};

export const useConsentStore = create<ConsentStore>((set) => ({
  pendingRequests: mockAccessRequests,
  activePermissions: mockPermissions,
  selectedScopes: ["diaries", "heart_rate"],
  isLoading: false,
  error: null,
  setSelectedScopes: (scopes) => set({ selectedScopes: scopes }),
  approveRequestLocal: (requestId, scopes) =>
    set((state) => ({ isLoading: true })),
    set((state) => {
      const request = state.pendingRequests.find((item) => item.id === requestId);
      return {
        pendingRequests: state.pendingRequests.filter((item) => item.id !== requestId),
        activePermissions: request
          ? [
              {
                id: `permission-${requestId}`,
                doctorId: request.doctorId,
                doctorName: request.doctorName,
                specialty: request.specialty,
                approvedScopes: scopes,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              },
              ...state.activePermissions,
            ]
          : state.activePermissions,
        isLoading: false,
      };
    }),
  rejectRequestLocal: (requestId) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((item) => item.id !== requestId),
    })),
  revokeDoctorLocal: (doctorId) =>
    set((state) => ({
      activePermissions: state.activePermissions.filter(
        (permission) => permission.doctorId !== doctorId,
      ),
    })),
}));
