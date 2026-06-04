import { useConsentStore } from "../store/consentStore";

export function useConsent() {
  const pendingRequests = useConsentStore((state) => state.pendingRequests);
  const activePermissions = useConsentStore((state) => state.activePermissions);
  const loadAccessRequests = useConsentStore((state) => state.loadAccessRequests);
  const loadHistory = useConsentStore((state) => state.loadHistory);
  const approveRequest = useConsentStore((state) => state.approveRequest);
  const rejectRequest = useConsentStore((state) => state.rejectRequest);
  const revokeDoctorPermission = useConsentStore((state) => state.revokeDoctorPermission);
  const error = useConsentStore((state) => state.error);

  return {
    pendingRequests,
    activePermissions,
    loadAccessRequests,
    loadHistory,
    approveRequest,
    rejectRequest,
    revokeDoctorPermission,
    error,
  };
}
