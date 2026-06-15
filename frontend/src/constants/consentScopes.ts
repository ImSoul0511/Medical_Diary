import { HEALTH_METRIC_CONSENT_SCOPES, type ConsentScope } from "../types/consent";

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
  manual_health_records: "Chỉ số nhập tay",
  patient_documents: "Tài liệu y tế cá nhân",
};

export const consentScopeGroups = [
  {
    title: "Thông tin cấp cứu",
    scopes: ["blood_type", "allergies", "emergency_contact"] satisfies ConsentScope[],
  },
  {
    title: "Hồ sơ cá nhân",
    scopes: ["medical_records", "prescriptions", "diaries", "patient_documents"] satisfies ConsentScope[],
  },
  {
    title: "Chỉ số sức khỏe",
    scopes: [...HEALTH_METRIC_CONSENT_SCOPES] satisfies ConsentScope[],
  },
];
