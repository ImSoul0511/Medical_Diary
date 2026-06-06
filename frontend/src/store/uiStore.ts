import { create } from "zustand";
import type { RoleTheme } from "../types/auth";

type UiStore = {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  currentRoleTheme: RoleTheme;
  globalLoading: boolean;
  lastError: string | null;
  toastMessage: string | null;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (value: boolean) => void;
  setRoleTheme: (role: RoleTheme) => void;
  setGlobalLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  clear: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  currentRoleTheme: "patient",
  globalLoading: false,
  lastError: null,
  toastMessage: null,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebarOpen: (value) => set({ mobileSidebarOpen: value }),
  setRoleTheme: (role) => set({ currentRoleTheme: role }),
  setGlobalLoading: (value) => set({ globalLoading: value }),
  setError: (error) => set({ lastError: error }),
  showToast: (message) => set({ toastMessage: message }),
  clearToast: () => set({ toastMessage: null }),
  clear: () =>
    set({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      currentRoleTheme: "patient",
      globalLoading: false,
      lastError: null,
      toastMessage: null,
    }),
}));
