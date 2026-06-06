import { useAdminStore } from "./adminStore";
import { useConsentStore } from "./consentStore";
import { useDiaryStore } from "./diaryStore";
import { useDoctorStore } from "./doctorStore";
import { useEmergencyStore } from "./emergencyStore";
import { useHealthMetricsStore } from "./healthMetricsStore";
import { useMedicalRecordStore } from "./medicalRecordStore";
import { useNotificationStore } from "./notificationStore";
import { usePrescriptionStore } from "./prescriptionStore";
import { useUiStore } from "./uiStore";
import { useUserStore } from "./userStore";

export async function resetAllDomainStores() {
  useAdminStore.getState().clear();
  useConsentStore.getState().clear();
  useDiaryStore.getState().clear();
  useDoctorStore.getState().clear();
  useEmergencyStore.getState().clear();
  useHealthMetricsStore.getState().clear();
  useMedicalRecordStore.getState().clear();
  useNotificationStore.getState().clear();
  usePrescriptionStore.getState().clear();
  useUiStore.getState().clear();
  useUserStore.getState().clear();
}
