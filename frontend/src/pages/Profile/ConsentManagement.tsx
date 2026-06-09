import { useEffect } from "react";
import { Building2, Check, Shield, Stethoscope, X } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { consentScopeLabels } from "../../constants/consentScopes";
import { useConsent } from "../../hooks/useConsent";
import { formatDateTime } from "../../utils/date";

export function ConsentManagement() {
  const {
    pendingRequests,
    activePermissions,
    loadAccessRequests,
    loadHistory,
    approveRequest,
    rejectRequest,
    revokeDoctorPermission,
    error,
  } = useConsent();

  useEffect(() => {
    void loadAccessRequests().catch(() => undefined);
    void loadHistory().catch(() => undefined);
  }, [loadAccessRequests, loadHistory]);

  return (
    <AppShell role="user" title="Quản lý cấp quyền">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-secondary">Yêu cầu chờ duyệt</h2>
            <Badge tone="emergency">{pendingRequests.length}</Badge>
          </div>
          {error ? <p className="text-sm text-emergency">{error}</p> : null}
          {pendingRequests.length === 0 ? (
            <Card>
              <p className="text-sm text-mutedForeground">Chưa có yêu cầu cấp quyền.</p>
            </Card>
          ) : null}
          {pendingRequests.map((request) => (
            <Card key={request.id}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <h3 className="font-semibold text-secondary">{request.doctorName}</h3>
                  <div className="mt-2 grid gap-2 text-xs text-mutedForeground sm:grid-cols-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{request.doctorSpecialty ?? "Chưa có chuyên khoa"}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{request.doctorHospital ?? "Chưa có bệnh viện"}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-secondary">{request.reason}</p>
                  <p className="mt-2 text-xs text-mutedForeground">
                    Gửi lúc {formatDateTime(request.requestedAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.requestedScopes.map((scope) => (
                      <Badge key={scope} tone="info">
                        {consentScopeLabels[scope]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                  <Button
                    leftIcon={<Check className="h-4 w-4" />}
                    onClick={() => {
                      void approveRequest(request.id, request.requestedScopes).catch(() => undefined);
                    }}
                    size="sm"
                    variant="success"
                  >
                    Đồng ý
                  </Button>
                  <Button
                    leftIcon={<X className="h-4 w-4" />}
                    onClick={() => {
                      void rejectRequest(request.id).catch(() => undefined);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-secondary">Đang có quyền</h2>
          {activePermissions.length === 0 ? (
            <Card>
              <p className="text-sm text-mutedForeground">Chưa có bác sĩ nào được cấp quyền.</p>
            </Card>
          ) : null}
          {activePermissions.map((permission) => (
            <Card key={permission.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-secondary">{permission.doctorName}</h3>
                  <div className="mt-2 grid gap-2 text-xs text-mutedForeground sm:grid-cols-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{permission.doctorSpecialty ?? "Chưa có chuyên khoa"}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{permission.doctorHospital ?? "Chưa có bệnh viện"}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-mutedForeground">
                    {permission.expiresAt ? `Hết hạn ${formatDateTime(permission.expiresAt)}` : "Không thời hạn"}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    void revokeDoctorPermission(permission.doctorId).catch(() => undefined);
                  }}
                  size="sm"
                  variant="danger"
                >
                  Thu hồi
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {permission.approvedScopes.map((scope) => (
                  <Badge key={scope} tone="success">
                    {consentScopeLabels[scope]}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
