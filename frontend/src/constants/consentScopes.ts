import type { ConsentScope } from "../types/consent";

export const consentScopeLabels: Record<ConsentScope, string> = {
  blood_type: "Nhóm máu",
  allergies: "Dị ứng",
  emergency_contact: "SĐT khẩn cấp",
  medical_records: "Hồ sơ bệnh án",
  prescriptions: "Đơn thuốc",
  diaries: "Nhật ký triệu chứng",
  heart_rate: "Nhịp tim",
  step_count: "Bước chân",
  respiratory_rate: "Nhịp thở",
};

export const consentScopeGroups = [
  {
    title: "Public view",
    scopes: ["blood_type", "allergies", "emergency_contact"] satisfies ConsentScope[],
  },
  {
    title: "Private records",
    scopes: ["medical_records", "prescriptions", "diaries"] satisfies ConsentScope[],
  },
  {
    title: "Vitals",
    scopes: ["heart_rate", "step_count", "respiratory_rate"] satisfies ConsentScope[],
  },
];
