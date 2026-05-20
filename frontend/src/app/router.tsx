import { Navigate, Route, Routes } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { AdminAuditLogs } from "../pages/Dashboard/AdminAuditLogs";
import { AdminDoctorApproval } from "../pages/Dashboard/AdminDoctorApproval";
import { DoctorPatientDetail } from "../pages/Dashboard/DoctorPatientDetail";
import { DoctorPrescription } from "../pages/Dashboard/DoctorPrescription";
import { DoctorSearch } from "../pages/Dashboard/DoctorSearch";
import { PatientDashboard } from "../pages/Dashboard/PatientDashboard";
import { DiaryPage } from "../pages/Diary/DiaryPage";
import { HealthMetricsPage } from "../pages/HealthMetrics/HealthMetricsPage";
import { AdminLoginPage } from "../pages/Login/AdminLoginPage";
import { LoginPage } from "../pages/Login/LoginPage";
import { RegisterPage } from "../pages/Login/RegisterPage";
import { ConsentManagement } from "../pages/Profile/ConsentManagement";
import { EmergencyPublicView } from "../pages/Profile/EmergencyPublicView";
import { PrivacySettings } from "../pages/Profile/PrivacySettings";
import { ProfilePage } from "../pages/Profile/ProfilePage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LoginPage />} path={ROUTES.login} />
      <Route element={<RegisterPage />} path={ROUTES.register} />
      <Route element={<AdminLoginPage />} path={ROUTES.adminLogin} />
      <Route element={<PatientDashboard />} path={ROUTES.patientDashboard} />
      <Route element={<DiaryPage />} path={ROUTES.diary} />
      <Route element={<HealthMetricsPage />} path={ROUTES.healthMetrics} />
      <Route element={<ProfilePage />} path={ROUTES.profile} />
      <Route element={<ConsentManagement />} path={ROUTES.consent} />
      <Route element={<PrivacySettings />} path={ROUTES.privacy} />
      <Route element={<EmergencyPublicView />} path="/cap-cuu/:token" />
      <Route element={<DoctorSearch />} path={ROUTES.doctorSearch} />
      <Route element={<DoctorPatientDetail />} path="/bac-si/benh-nhan/:patientId" />
      <Route element={<DoctorPrescription />} path="/bac-si/tao-don-thuoc/:patientId" />
      <Route element={<AdminDoctorApproval />} path={ROUTES.adminDoctorApproval} />
      <Route element={<AdminAuditLogs />} path={ROUTES.adminAuditLogs} />
      <Route element={<Navigate replace to={ROUTES.login} />} path="*" />
    </Routes>
  );
}
