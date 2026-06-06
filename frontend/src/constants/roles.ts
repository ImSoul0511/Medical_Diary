import type { Role } from "../types/auth";

export const roleLabels: Record<Role, string> = {
  user: "Bệnh nhân",
  doctor: "Bác sĩ",
  admin: "Quản trị viên",
};
