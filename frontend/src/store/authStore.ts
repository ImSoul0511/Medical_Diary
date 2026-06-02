/**
 * Tệp: frontend/src/store/authStore.ts
 * Mục đích: Zustand store quản lý trạng thái xác thực (cả mock và flow đăng nhập thật).
 * Xuất khẩu: hook `useAuthStore` với các phương thức `login`, `loginMock`, `logoutMock` và các flag auth.
 * Ghi chú: Lưu `accessToken` trong bộ nhớ; fallback về mock nếu backend trả lỗi.
 */

import { create } from "zustand";
import { mockUsers } from "../constants/mockData";
import type { MockUser, Role } from "../types/auth";
import { authApi } from "../api/authApi";

type AuthStore = {
  selectedRole: Role;
  mockUser: MockUser | null;
  accessToken?: string | null;
  isLoading?: boolean;
  error?: string | null;
  suppressAutoLogin?: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean;
  loginMock: (role: Role, email?: string) => MockUser;
  login: (role: Role, email: string, password: string) => Promise<MockUser>;
  logoutMock: () => void;
  setSelectedRole: (role: Role) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  selectedRole: "user",
  mockUser: null,
  accessToken: null,
  isLoading: false,
  error: null,
  suppressAutoLogin: false,
  isAuthenticated: false,
  isHydrated: true,
  loginMock: (role, email) => {
    const user = { ...mockUsers[role], email: email || mockUsers[role].email };
    // create a mock access token for dev flows
    const token = `mock-token-${role}`;
    set({ selectedRole: role, mockUser: user, isAuthenticated: true, accessToken: token, suppressAutoLogin: false });
    return user;
  },
  login: async (role, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await authApi.login({ email, password });
      const user: MockUser = { id: resp.user.id, role: resp.user.role, fullName: email.split('@')[0], email, subtitle: '', initials: '' };
      set({ selectedRole: role, mockUser: user, isAuthenticated: true, accessToken: resp.access_token, suppressAutoLogin: false, isLoading: false });
      return user;
    } catch (err: any) {
      // fallback to mock behavior on error
      const user = { ...mockUsers[role], email };
      const token = `mock-token-${role}`;
      set({ selectedRole: role, mockUser: user, isAuthenticated: true, accessToken: token, suppressAutoLogin: false, isLoading: false, error: err?.message ?? String(err) });
      return user;
    }
  },
  logoutMock: () => set({ mockUser: null, isAuthenticated: false, selectedRole: "user", accessToken: null, suppressAutoLogin: true }),
  setSelectedRole: (role) => set({ selectedRole: role }),
}));
