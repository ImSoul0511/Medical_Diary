import { create } from "zustand";
import { authApi } from "../api/auth/authApi";
import type { AuthSession, AuthUser, RegisterDoctorForm, RegisterPatientForm, Role } from "../types/auth";
import { resetAllDomainStores } from "./resetStores";
import { getErrorMessage } from "./storeUtils";

type AuthStore = {
  selectedRole: Role;
  currentUser: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  sessions: AuthSession[];
  isLoadingSessions: boolean;
  sessionMutationLoading: boolean;
  sessionError: string | null;
  login: (role: Role, email: string, password: string) => Promise<AuthUser>;
  registerPatient: (form: RegisterPatientForm) => Promise<void>;
  registerDoctor: (form: RegisterDoctorForm) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  refreshSession: () => Promise<string>;
  logout: () => Promise<void>;
  loadSessions: () => Promise<AuthSession[]>;
  revokeSession: (sessionId: string, password: string) => Promise<void>;
  revokeAllSessions: (password: string) => Promise<void>;
  setAccessToken: (accessToken: string | null) => void;
  setSelectedRole: (role: Role) => void;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
};

let refreshSessionPromise: Promise<string> | null = null;

function toDisplayUser(id: string, role: Role, email: string): AuthUser {
  const name = email.split("@")[0] || "Medical Diary";
  const initials =
    name
      .split(/[._\-\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "MD";

  return {
    id,
    role,
    fullName: name,
    email,
    subtitle: role,
    initials,
  };
}

function mapSessionDto(session: {
  session_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_agent: string;
  ip: string;
}): AuthSession {
  return {
    sessionId: session.session_id,
    userId: session.user_id,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    userAgent: session.user_agent,
    ip: session.ip,
  };
}

export const useAuthStore = create<AuthStore>((set) => ({
  selectedRole: "user",
  currentUser: null,
  accessToken: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  isHydrated: false,
  sessions: [],
  isLoadingSessions: false,
  sessionMutationLoading: false,
  sessionError: null,
  login: async (_role, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      const role = response.user.role as Role;
      const user = toDisplayUser(response.user.id, role, email);

      await resetAllDomainStores();
      set({
        selectedRole: role,
        currentUser: user,
        isAuthenticated: true,
        accessToken: response.access_token,
        isLoading: false,
        isHydrated: true,
        error: null,
      });
      return user;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.message ?? "Login failed.",
        accessToken: null,
        isAuthenticated: false,
        isHydrated: true,
      });
      throw error;
    }
  },
  registerPatient: async (form) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.register({
        email: form.email,
        phone_number: form.phoneNumber,
        password: form.password,
        full_name: form.fullName,
        gender: form.gender,
        date_of_birth: form.dateOfBirth,
      });
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.message ?? "Register failed.",
      });
      throw error;
    }
  },
  registerDoctor: async (form) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.registerDoctor({
        email: form.email,
        phone_number: form.phoneNumber,
        password: form.password,
        full_name: form.fullName,
        gender: form.gender,
        date_of_birth: form.dateOfBirth,
        cccd: form.cccd,
        license_number: form.licenseNumber,
        specialty: form.specialty,
        hospital: form.hospital,
        certificate_file: form.certificateFile,
      });
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.message ?? "Doctor registration failed.",
      });
      throw error;
    }
  },
  requestPasswordReset: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.requestPasswordReset({ email });
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.message ?? "Password reset failed.",
      });
      throw error;
    }
  },
  refreshSession: async () => {
    if (refreshSessionPromise) return refreshSessionPromise;

    refreshSessionPromise = (async () => {
      try {
        const response = await authApi.refresh();
        set({
          accessToken: response.access_token,
          isAuthenticated: true,
          isHydrated: true,
          error: null,
        });
        return response.access_token;
      } catch (error: any) {
        await resetAllDomainStores();
        set({
          accessToken: null,
          isAuthenticated: false,
          isHydrated: true,
          error: error?.message ?? "Session refresh failed.",
        });
        throw error;
      } finally {
        refreshSessionPromise = null;
      }
    })();

    return refreshSessionPromise;
  },
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      refreshSessionPromise = null;
      await resetAllDomainStores();
      set({
        currentUser: null,
        isAuthenticated: false,
        selectedRole: "user",
        accessToken: null,
        isHydrated: true,
        sessions: [],
        sessionError: null,
        isLoadingSessions: false,
        sessionMutationLoading: false,
      });
    }
  },
  loadSessions: async () => {
    set({ isLoadingSessions: true, sessionError: null });
    try {
      const response = await authApi.getSessions();
      const sessions = response.sessions.map(mapSessionDto);
      set({ sessions, isLoadingSessions: false, sessionError: null });
      return sessions;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load sessions.");
      set({ isLoadingSessions: false, sessionError: message });
      throw error;
    }
  },
  revokeSession: async (sessionId, password) => {
    set({ sessionMutationLoading: true, sessionError: null });
    try {
      await authApi.revokeSession({ session_id: sessionId, password });
      const response = await authApi.getSessions();
      set({
        sessions: response.sessions.map(mapSessionDto),
        sessionMutationLoading: false,
        sessionError: null,
      });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to revoke session.");
      set({ sessionMutationLoading: false, sessionError: message });
      throw error;
    }
  },
  revokeAllSessions: async (password) => {
    set({ sessionMutationLoading: true, sessionError: null });
    try {
      await authApi.revokeAllSessions({ password });
      try {
        await authApi.logout();
      } catch {
        // The revoke-all call already invalidated auth.sessions; logout only clears the refresh cookie.
      }
      refreshSessionPromise = null;
      await resetAllDomainStores();
      set({
        currentUser: null,
        isAuthenticated: false,
        selectedRole: "user",
        accessToken: null,
        isHydrated: true,
        sessions: [],
        isLoadingSessions: false,
        sessionMutationLoading: false,
        sessionError: null,
      });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to revoke all sessions.");
      set({ sessionMutationLoading: false, sessionError: message });
      throw error;
    }
  },
  setAccessToken: (accessToken) =>
    set({
      accessToken,
      isAuthenticated: Boolean(accessToken),
      isHydrated: true,
    }),
  setSelectedRole: (role) => set({ selectedRole: role }),
  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.forgotPassword({ email });
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.message ?? "Gửi yêu cầu khôi phục thất bại.",
      });
      throw error;
    }
  },
  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.message ?? "Đổi mật khẩu thất bại.",
      });
      throw error;
    }
  },
  resetPassword: async (newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.resetPassword({ new_password: newPassword });
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.message ?? "Đặt lại mật khẩu thất bại.",
      });
      throw error;
    }
  },
}));
