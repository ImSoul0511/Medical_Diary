import { useConsentStore } from "../store/consentStore";

export function useConsent() {
  const pendingRequests = useConsentStore((state) => state.pendingRequests);
  const activePermissions = useConsentStore((state) => state.activePermissions);
  const approveRequestLocal = useConsentStore((state) => state.approveRequestLocal);
  const rejectRequestLocal = useConsentStore((state) => state.rejectRequestLocal);
  const revokeDoctorLocal = useConsentStore((state) => state.revokeDoctorLocal);

  return {
    pendingRequests,
    activePermissions,
    approveRequestLocal,
    rejectRequestLocal,
    revokeDoctorLocal,
  };
}
