/**
 * Tệp: frontend/src/types/auth.ts
 * Mục đích: Các kiểu TypeScript liên quan đến xác thực được dùng chung trong frontend.
 * Kiểu: `Role`, `MockUser`, `LoginForm`, v.v.
 */

export type Role = "user" | "doctor" | "admin";

export type RoleTheme = "patient" | "doctor" | "admin";

export type AuthUser = {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  subtitle: string;
  initials: string;
};

export type MockUser = AuthUser;

export type LoginForm = {
  email: string;
  password: string;
  role: Role;
};

export type RegisterMode = "patient" | "doctor";
