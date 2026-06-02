import type { DoctorApproval, AuditLog } from "../types/admin";
import type { MockUser } from "../types/auth";
import type { AccessRequest, ActivePermission } from "../types/consent";
import type {
  DiaryEntry,
  HealthMetric,
  MedicalRecord,
  Prescription,
  PrescriptionLog,
} from "../types/medical";
import type { AccessHistoryItem, DoctorPublicProfile, UserProfile } from "../types/user";

export const mockUsers: Record<"user" | "doctor" | "admin", MockUser> = {
  user: {
    id: "patient-001",
    role: "user",
    fullName: "Nguyễn Văn An",
    email: "patient@example.com",
    subtitle: "Mã BN: BN-2026-0892",
    initials: "NA",
  },
  doctor: {
    id: "doctor-001",
    role: "doctor",
    fullName: "BS. Trần Thị Mai",
    email: "doctor@example.com",
    subtitle: "Tim mạch - Đang trực",
    initials: "TM",
  },
  admin: {
    id: "admin-001",
    role: "admin",
    fullName: "Quản trị viên",
    email: "admin@example.com",
    subtitle: "Hệ thống - Toàn quyền",
    initials: "QT",
  },
};

export const mockProfile: UserProfile = {
  id: "patient-001",
  fullName: "Nguyễn Văn An",
  gender: "male",
  dateOfBirth: "1992-08-18",
  bloodType: "O+",
  allergies: "Penicillin, hải sản",
  emergencyContact: "0901 234 567 - Nguyễn Thị Lan",
  phoneNumber: "0987 654 321",
  address: "Quận 3, TP. Hồ Chí Minh",
  privacySettings: {
    showBloodType: true,
    showAllergies: true,
    showEmergencyContact: false,
  },
};

export const mockMetrics: HealthMetric[] = [
  {
    id: "metric-1",
    recordedAt: "2026-05-14T07:30:00",
    heartRate: 76,
    stepCount: 6200,
    respiratoryRate: 16,
    systolic: 118,
    diastolic: 76,
  },
  {
    id: "metric-2",
    recordedAt: "2026-05-15T07:30:00",
    heartRate: 82,
    stepCount: 8100,
    respiratoryRate: 17,
    systolic: 121,
    diastolic: 78,
  },
  {
    id: "metric-3",
    recordedAt: "2026-05-16T07:30:00",
    heartRate: 79,
    stepCount: 7400,
    respiratoryRate: 16,
    systolic: 119,
    diastolic: 75,
  },
  {
    id: "metric-4",
    recordedAt: "2026-05-17T07:30:00",
    heartRate: 88,
    stepCount: 5100,
    respiratoryRate: 18,
    systolic: 126,
    diastolic: 82,
  },
  {
    id: "metric-5",
    recordedAt: "2026-05-18T07:30:00",
    heartRate: 74,
    stepCount: 9200,
    respiratoryRate: 15,
    systolic: 116,
    diastolic: 74,
  },
  {
    id: "metric-6",
    recordedAt: "2026-05-19T07:30:00",
    heartRate: 77,
    stepCount: 8800,
    respiratoryRate: 16,
    systolic: 117,
    diastolic: 75,
  },
];

export const mockDiaries: DiaryEntry[] = [
  {
    id: "diary-1",
    content: "Đỡ mệt hơn sau khi ngủ đủ giấc. Có hơi đau đầu nhẹ vào buổi chiều.",
    symptoms: [
      { name: "Đau đầu", severity: 3 },
      { name: "Mệt mỏi", severity: 2 },
    ],
    mood: "neutral",
    createdAt: "2026-05-19T19:15:00",
  },
  {
    id: "diary-2",
    content: "Sau khi đi bộ 30 phút, nhịp thở ổn định. Không thấy đau ngực.",
    symptoms: [{ name: "Khó thở", severity: 1 }],
    mood: "good",
    createdAt: "2026-05-18T20:10:00",
  },
];

export const mockRecords: MedicalRecord[] = [
  {
    id: "record-1",
    title: "Tái khám tim mạch",
    doctorName: "BS. Trần Thị Mai",
    hospital: "Bệnh viện Đại học Y Dược",
    diagnosis: "Huyết áp ổn định, tiếp tục theo dõi vận động và thuốc.",
    createdAt: "2026-05-10T09:00:00",
  },
  {
    id: "record-2",
    title: "Xét nghiệm máu định kỳ",
    doctorName: "BS. Lê Quốc Huy",
    hospital: "Phòng khám Gia Đình",
    diagnosis: "Chỉ số đường huyết trong ngưỡng kiểm soát.",
    createdAt: "2026-04-22T10:30:00",
  },
];

export const mockPrescriptions: Prescription[] = [
  {
    id: "rx-1",
    title: "Đơn thuốc huyết áp tháng 5",
    doctorName: "BS. Trần Thị Mai",
    createdAt: "2026-05-10T09:20:00",
    items: [
      {
        id: "rx-item-1",
        name: "Amlodipine 5mg",
        dosage: "1 viên",
        schedule: ["Sáng"],
        durationDays: 30,
        note: "Uống sau ăn sáng.",
      },
      {
        id: "rx-item-2",
        name: "Metformin 500mg",
        dosage: "1 viên",
        schedule: ["Sáng", "Tối"],
        durationDays: 30,
        note: "Theo dõi đường huyết khi mệt.",
      },
    ],
  },
];

export const mockPrescriptionLogs: PrescriptionLog[] = [
  {
    id: "rx-log-1",
    prescriptionId: "rx-1",
    scheduledAt: "2026-05-20T08:00:00",
    medicineName: "Amlodipine 5mg",
    status: "taken",
  },
  {
    id: "rx-log-2",
    prescriptionId: "rx-1",
    scheduledAt: "2026-05-20T20:00:00",
    medicineName: "Metformin 500mg",
    status: "untaken",
  },
];

export const mockAccessRequests: AccessRequest[] = [
  {
    id: "request-1",
    doctorId: "doctor-002",
    doctorName: "BS. Phạm Minh Châu",
    specialty: "Nội tổng quát",
    hospital: "Bệnh viện Nhân Dân 115",
    reason: "Cần xem nhật ký triệu chứng trong đợt tái khám.",
    requestedScopes: ["diaries", "heart_rate", "respiratory_rate"],
    requestedAt: "2026-05-20T08:40:00",
    status: "pending",
  },
  {
    id: "request-2",
    doctorId: "doctor-003",
    doctorName: "BS. Hoàng Tuấn Kiệt",
    specialty: "Dị ứng miễn dịch",
    hospital: "Phòng khám An Tâm",
    reason: "Đánh giá lịch sử dị ứng trước khi kê thuốc.",
    requestedScopes: ["allergies", "medical_records", "prescriptions"],
    requestedAt: "2026-05-19T15:20:00",
    status: "pending",
  },
];

export const mockPermissions: ActivePermission[] = [
  {
    id: "permission-1",
    doctorId: "doctor-001",
    doctorName: "BS. Trần Thị Mai",
    specialty: "Tim mạch",
    approvedScopes: ["heart_rate", "step_count", "medical_records", "prescriptions"],
    expiresAt: "2026-06-20T23:59:59",
  },
];

export const mockDoctors: DoctorPublicProfile[] = [
  {
    id: "doctor-001",
    fullName: "BS. Trần Thị Mai",
    specialty: "Tim mạch",
    hospital: "Bệnh viện Đại học Y Dược",
    status: "approved",
  },
  {
    id: "doctor-002",
    fullName: "BS. Phạm Minh Châu",
    specialty: "Nội tổng quát",
    hospital: "Bệnh viện Nhân Dân 115",
    status: "approved",
  },
];

export const mockAccessHistory: AccessHistoryItem[] = [
  {
    id: "history-1",
    actorName: "BS. Trần Thị Mai",
    actorRole: "doctor",
    action: "Xem hồ sơ bệnh án",
    accessedAt: "2026-05-19T10:12:00",
  },
  {
    id: "history-2",
    actorName: "QR cấp cứu",
    actorRole: "emergency",
    action: "Xem public emergency profile",
    accessedAt: "2026-05-18T21:04:00",
  },
];

export const mockDoctorApprovals: DoctorApproval[] = [
  {
    id: "approval-1",
    fullName: "BS. Nguyễn Minh Đức",
    specialty: "Cấp cứu",
    hospital: "Bệnh viện Chợ Rẫy",
    licenseNumber: "HCM-2026-18342",
    submittedAt: "2026-05-20T09:30:00",
    status: "pending",
  },
  {
    id: "approval-2",
    fullName: "BS. Lê Thảo Nhi",
    specialty: "Nhi khoa",
    hospital: "Bệnh viện Nhi Đồng 2",
    licenseNumber: "HCM-2026-17220",
    submittedAt: "2026-05-19T14:15:00",
    status: "pending",
  },
  {
    id: "approval-3",
    fullName: "BS. Võ Anh Khoa",
    specialty: "Thần kinh",
    hospital: "Bệnh viện Gia An 115",
    licenseNumber: "HCM-2026-16501",
    submittedAt: "2026-05-18T11:00:00",
    status: "pending",
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: "audit-1",
    actor: "admin@example.com",
    action: "APPROVE_DOCTOR",
    target: "doctor-008",
    status: "success",
    createdAt: "2026-05-20T10:05:00",
    details: { role: "admin", ip: "10.0.0.12" },
  },
  {
    id: "audit-2",
    actor: "doctor-002",
    action: "REQUEST_ACCESS",
    target: "patient-001",
    status: "warning",
    createdAt: "2026-05-20T08:40:00",
    details: { scopes: "diaries,heart_rate", consent: "pending" },
  },
  {
    id: "audit-3",
    actor: "anonymous",
    action: "EMERGENCY_ACCESS",
    target: "qr-token-demo",
    status: "success",
    createdAt: "2026-05-18T21:04:00",
    details: { fields: "blood_type,allergies", mode: "public" },
  },
];

export const mockNotifications = [
  {
    id: "notification-1",
    title: "Yêu cầu cấp quyền mới",
    message: "BS. Phạm Minh Châu muốn xem nhật ký triệu chứng.",
    audience: "doctor",
    createdAt: "2026-05-20T08:40:00",
    unread: true,
  },
  {
    id: "notification-2",
    title: "Nhắc uống thuốc",
    message: "Metformin 500mg còn một cữ tối hôm nay.",
    audience: "user",
    createdAt: "2026-05-20T18:00:00",
    unread: true,
  },
  {
    id: "notification-3",
    title: "Hồ sơ đã cập nhật",
    message: "Kết quả tái khám tim mạch đã được thêm vào hồ sơ.",
    audience: "all",
    createdAt: "2026-05-10T10:00:00",
    unread: false,
  },
];
