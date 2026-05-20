import { create } from "zustand";
import { mockUsers } from "../constants/mockData";
import type { MockUser, Role } from "../types/auth";

type AuthStore = {
  selectedRole: Role;
  mockUser: MockUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  loginMock: (role: Role, email?: string) => MockUser;
  logoutMock: () => void;
  setSelectedRole: (role: Role) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  selectedRole: "user",
  mockUser: null,
  isAuthenticated: false,
  isHydrated: true,
  loginMock: (role, email) => {
    const user = { ...mockUsers[role], email: email || mockUsers[role].email };
    set({ selectedRole: role, mockUser: user, isAuthenticated: true });
    return user;
  },
  logoutMock: () => set({ mockUser: null, isAuthenticated: false, selectedRole: "user" }),
  setSelectedRole: (role) => set({ selectedRole: role }),
}));
