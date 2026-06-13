/**
 * Tệp: frontend/src/app/router.tsx
 * Mục đích: Định nghĩa các route của SPA và ánh xạ đường dẫn sang các trang.
 * Xuất khẩu: `AppRouter` - bọc `Routes` của React Router được dùng ở entry của app.
 * Ghi chú: Giữ routes rõ ràng; các trang nằm trong thư mục `pages/`.
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { AdminAuditLogs } from "../pages/Dashboard/AdminAuditLogs";
import { AdminDoctorApproval } from "../pages/Dashboard/AdminDoctorApproval";
import { DoctorPatientDetail } from "../pages/Dashboard/DoctorPatientDetail";
import { DoctorPatientManagement } from "../pages/Dashboard/DoctorPatientManagement";
import { DoctorPrescription } from "../pages/Dashboard/DoctorPrescription";
import { DoctorSearch } from "../pages/Dashboard/DoctorSearch";
import { PatientDashboard } from "../pages/Dashboard/PatientDashboard";
import { DiaryPage } from "../pages/Diary/DiaryPage";
import { HealthMetricsPage } from "../pages/HealthMetrics/HealthMetricsPage";
import { AdminLoginPage } from "../pages/Login/AdminLoginPage";
import { LoginPage } from "../pages/Login/LoginPage";
import { RegisterPage } from "../pages/Login/RegisterPage";
import { ResetPasswordPage } from "../pages/Login/ResetPasswordPage";
import { ConsentManagement } from "../pages/Profile/ConsentManagement";
import { EmergencyPublicView } from "../pages/Profile/EmergencyPublicView";
import { PrivacySettings } from "../pages/Profile/PrivacySettings";
import { PrivateSettingsPage } from "../pages/Profile/PrivateSettingsPage";
import { ProfilePage } from "../pages/Profile/ProfilePage";
import { LongTermAnalyticsPage } from "../pages/HealthMetrics/LongTermAnalyticsPage";
import { PublicPatientProfile } from "../pages/Dashboard/PublicPatientProfile";
import { PatientPrescriptionTracker } from "../pages/Dashboard/PatientPrescriptionTracker";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LoginPage />} path={ROUTES.login} />
      <Route element={<LoginPage />} path={ROUTES.doctorLogin} />
      <Route element={<RegisterPage />} path={ROUTES.register} />
      <Route element={<ResetPasswordPage />} path={ROUTES.resetPassword} />
      <Route element={<AdminLoginPage />} path={ROUTES.adminLogin} />
      <Route element={<PatientDashboard />} path={ROUTES.patientDashboard} />
      <Route element={<PatientPrescriptionTracker />} path={ROUTES.prescriptions} />
      <Route element={<DiaryPage />} path={ROUTES.diary} />
      <Route element={<HealthMetricsPage />} path={ROUTES.healthMetrics} />
      <Route element={<LongTermAnalyticsPage />} path="/chi-so-suc-khoe/phan-tich" />
      <Route element={<ProfilePage />} path={ROUTES.profile} />
      <Route element={<ConsentManagement />} path={ROUTES.consent} />
      <Route element={<PrivateSettingsPage />} path={ROUTES.privateSettings} />
      <Route element={<PrivacySettings />} path={ROUTES.publicSetting} />
      <Route element={<EmergencyPublicView />} path="/cap-cuu/:token" />
      <Route element={<DoctorSearch />} path={ROUTES.doctorSearch} />
      <Route element={<DoctorPatientManagement />} path={ROUTES.doctorPatientManagement} />
      <Route element={<DoctorPatientDetail />} path="/bac-si/benh-nhan/:patientId" />
      <Route element={<PublicPatientProfile />} path="/bac-si/benh-nhan/:patientId/cong-khai" />
      <Route element={<DoctorPrescription />} path="/bac-si/tao-don-thuoc/:patientId" />
      <Route element={<AdminDoctorApproval />} path={ROUTES.adminDoctorApproval} />
      <Route element={<AdminAuditLogs />} path={ROUTES.adminAuditLogs} />
      <Route element={<Navigate replace to={ROUTES.login} />} path="*" />
    </Routes>
  );
}
