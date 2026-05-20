import type { Role } from "../types/auth";

export const roleLabels: Record<Role, string> = {
  user: "Bệnh nhân",
  doctor: "Bác sĩ",
  admin: "Quản trị viên",
};

export const roleDescriptions: Record<Role, string> = {
  user: "Theo dõi sức khỏe, nhật ký và quyền riêng tư.",
  doctor: "Tìm bệnh nhân, xin quyền và kê đơn nội bộ.",
  admin: "Duyệt bác sĩ và kiểm tra nhật ký hệ thống.",
};
