import { Gender } from "./users";
export type Role = "user" | "doctor" | "admin";

export type RoleTheme = "patient" | "doctor" | "admin";

export type RegisterMode = "patient" | "doctor";

export type AuthUser = {
  id: string;
  role: Role;
  fullName: string;
  email?: string;
  subtitle?: string;
  initials: string;
};

export type AuthSession = {
  sessionId: string;
  userId: string;
  createdAt: string; 
  updatedAt: string; 
  userAgent: string; 
  ip: string; 
};

export type LoginForm = {
  email: string;
  password: string;
  role: Role;
};

export type RegisterPatientForm = {
  email: string;
  phoneNumber: string;
  password: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
}

export type RegisterDoctorForm = RegisterPatientForm & {
  cccd: string;
  licenseNumber: string;
  specialty: string; 
  hospital: string;
  certificateFile: File | null;
}
