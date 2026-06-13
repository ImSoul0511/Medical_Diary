import {
  Activity,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  Pill,
  Search,
  Settings,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import type { Role } from "../types/auth";

export const ROUTES = {
  login: "/",
  doctorLogin: "/bac-si/dang-nhap",
  register: "/dang-ky",
  adminLogin: "/quan-tri/dang-nhap",
  patientDashboard: "/trang-chu",
  diary: "/nhat-ky-trieu-chung",
  healthMetrics: "/chi-so-suc-khoe",
  profile: "/ho-so-benh-an",
  consent: "/quan-ly-cap-quyen",
  privateSettings: "/cai-dat-rieng-tu",
  publicSetting: "/quan-ly-truy-cap-cong-khai",
  emergency: "/cap-cuu/demo-token",
  doctorSearch: "/bac-si/tim-kiem",
  doctorPatientManagement: "/bac-si/quan-ly-benh-nhan",
  doctorPatient: "/bac-si/benh-nhan/demo-patient",
  doctorPrescription: "/bac-si/tao-don-thuoc/demo-patient",
  adminDoctorApproval: "/quan-tri/phe-duyet-bac-si",
  adminAuditLogs: "/quan-tri/nhat-ky-kiem-toan",
  resetPassword: "/reset-password",
  prescriptions: "/don-thuoc",
} as const;

export type NavigationItem = {
  label: string;
  path: string;
  icon: typeof Home;
  badge?: number;
};

export const roleHomePath: Record<Role, string> = {
  user: ROUTES.patientDashboard,
  doctor: ROUTES.doctorSearch,
  admin: ROUTES.adminDoctorApproval,
};

export const patientNavigation: NavigationItem[] = [
  { icon: Home, label: "Trang chủ", path: ROUTES.patientDashboard },
  { icon: Pill, label: "Đơn thuốc", path: ROUTES.prescriptions },
  { icon: Activity, label: "Nhật ký triệu chứng", path: ROUTES.diary },
  { icon: HeartPulse, label: "Chỉ số sức khỏe", path: ROUTES.healthMetrics },
  { icon: FileText, label: "Hồ sơ bệnh án", path: ROUTES.profile },
  { icon: Shield, label: "Quản lý cấp quyền", path: ROUTES.consent },
  { icon: Settings, label: "Cài đặt riêng tư", path: ROUTES.privateSettings },
  { icon: Settings, label: "Truy cập công khai", path: ROUTES.publicSetting },
];

export const doctorNavigation: NavigationItem[] = [
  { icon: Settings, label: "Cài đặt riêng tư", path: ROUTES.privateSettings },
  { icon: Search, label: "Tìm kiếm bệnh nhân", path: ROUTES.doctorSearch },
  { icon: Users, label: "Quản lý bệnh nhân", path: ROUTES.doctorPatientManagement },
];

export const adminNavigation: NavigationItem[] = [
  { icon: UserCheck, label: "Phê duyệt bác sĩ", path: ROUTES.adminDoctorApproval },
  { icon: ClipboardList, label: "Nhật ký kiểm toán", path: ROUTES.adminAuditLogs },
];
