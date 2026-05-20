export type Role = "user" | "doctor" | "admin";

export type RoleTheme = "patient" | "doctor" | "admin";

export type MockUser = {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  subtitle: string;
  initials: string;
};

export type LoginForm = {
  email: string;
  password: string;
  role: Role;
};

export type RegisterMode = "patient" | "doctor";
