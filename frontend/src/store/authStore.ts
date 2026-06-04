import { create } from "zustand";
import { authApi } from "../api/auth/authApi";
import type { AuthUser, Role } from "../types/auth";

type AuthStore = {
  selectedRole: Role;
  currentUser: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (role: Role, email: string, password: string) => Promise<AuthUser>;
  refreshSession: () => Promise<string>;
  logout: () => Promise<void>;
  setAccessToken: (accessToken: string | null) => void;
  setSelectedRole: (role: Role) => void;
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

export const useAuthStore = create<AuthStore>((set) => ({
  selectedRole: "user",
  currentUser: null,
  accessToken: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  isHydrated: false,
  login: async (_role, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      const role = response.user.role as Role;
      const user = toDisplayUser(response.user.id, role, email);

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
  refreshSession: async () => {
    if (refreshSessionPromise) return refreshSessionPromise;

    refreshSessionPromise = (async () => {
      try {
        const refreshFn = (authApi as any).refreshToken || (authApi as any).refresh || (authApi as any).refreshSession;
        if (typeof refreshFn !== "function") {
          throw new Error("No refresh token method available on authApi");
        }
        const response = await refreshFn();
        set({
          accessToken: response.access_token,
          isAuthenticated: true,
          isHydrated: true,
          error: null,
        });
        return response.access_token;
      } catch (error: any) {
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
      set({
        currentUser: null,
        isAuthenticated: false,
        selectedRole: "user",
        accessToken: null,
        isHydrated: true,
      });
    }
  },
  setAccessToken: (accessToken) =>
    set({
      accessToken,
      isAuthenticated: Boolean(accessToken),
      isHydrated: true,
    }),
  setSelectedRole: (role) => set({ selectedRole: role }),
}));
