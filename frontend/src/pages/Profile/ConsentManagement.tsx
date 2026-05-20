import { Check, Shield, X } from "lucide-react";
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
    approveRequestLocal,
    rejectRequestLocal,
    revokeDoctorLocal,
  } = useConsent();

  return (
    <AppShell
      description="Duyệt, từ chối hoặc thu hồi quyền truy cập dữ liệu y tế."
      role="user"
      title="Quản lý cấp quyền"
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-secondary">Yêu cầu chờ duyệt</h2>
            <Badge tone="emergency">{pendingRequests.length}</Badge>
          </div>
          {pendingRequests.map((request) => (
            <Card key={request.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-semibold text-secondary">{request.doctorName}</h3>
                  <p className="text-sm text-mutedForeground">
                    {request.specialty} - {request.hospital}
                  </p>
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
                <div className="flex gap-2">
                  <Button
                    leftIcon={<Check className="h-4 w-4" />}
                    onClick={() => approveRequestLocal(request.id, request.requestedScopes)}
                    size="sm"
                    variant="success"
                  >
                    Đồng ý
                  </Button>
                  <Button
                    leftIcon={<X className="h-4 w-4" />}
                    onClick={() => rejectRequestLocal(request.id)}
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
          {activePermissions.map((permission) => (
            <Card key={permission.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-secondary">{permission.doctorName}</h3>
                  <p className="text-sm text-mutedForeground">{permission.specialty}</p>
                  <p className="mt-1 text-xs text-mutedForeground">
                    Hết hạn {formatDateTime(permission.expiresAt)}
                  </p>
                </div>
                <Button
                  onClick={() => revokeDoctorLocal(permission.doctorId)}
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
