import { useEffect } from "react";
import { Eye, RefreshCw, ShieldPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { consentScopeLabels } from "../../constants/consentScopes";
import { useDoctorStore } from "../../store/doctorStore";
import { useUiStore } from "../../store/uiStore";
import { HEALTH_METRIC_CONSENT_SCOPES } from "../../types/consent";
import type { ManagedPatient } from "../../types/doctor";
import { formatDateTime } from "../../utils/date";
import { formatGender } from "../../utils/gender";

export function DoctorPatientManagement() {
  const showToast = useUiStore((state) => state.showToast);
  const managedPatients = useDoctorStore((state) => state.managedPatients);
  const loadManagedPatients = useDoctorStore((state) => state.loadManagedPatients);
  const requestAccess = useDoctorStore((state) => state.requestAccess);
  const isLoading = useDoctorStore((state) => state.isLoadingManagedPatients);
  const error = useDoctorStore((state) => state.error);

  useEffect(() => {
    void loadManagedPatients().catch(() => undefined);
  }, [loadManagedPatients]);

  function requestAgain(patientId: string) {
    void requestAccess({
      patientId,
      requestedScopes: [
        "blood_type",
        "allergies",
        "emergency_contact",
        "medical_records",
        "prescriptions",
        "diaries",
        ...HEALTH_METRIC_CONSENT_SCOPES,
        "manual_health_records",
      ],
      reason: "Cần gia hạn quyền truy cập để tiếp tục theo dõi và điều trị.",
    })
      .then(() => showToast("Đã gửi yêu cầu gia hạn quyền."))
      .catch(() => undefined);
  }

  const columns: DataTableColumn<ManagedPatient>[] = [
    {
      key: "patient",
      header: "Bệnh nhân",
      render: (row) => (
        <div>
          <p className="font-medium text-secondary">{row.fullName}</p>
          <p className="text-xs text-mutedForeground">Giới tính: {formatGender(row.gender)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Quyền",
      render: (row) => <Badge tone={row.accessStatus === "expired" ? "pending" : "success"}>{row.accessStatus === "expired" ? "Hết hạn" : "Còn hiệu lực"}</Badge>,
    },
    {
      key: "expires",
      header: "Hạn",
      render: (row) => (row.expiresAt ? formatDateTime(row.expiresAt) : "Không thời hạn"),
    },
    {
      key: "scope",
      header: "Phạm vi",
      render: (row) => (
        <div className="flex max-w-md flex-wrap gap-1.5">
          {row.scopes.slice(0, 4).map((scope) => (
            <Badge key={scope} tone="info">
              {consentScopeLabels[scope]}
            </Badge>
          ))}
          {row.scopes.length > 4 ? <Badge tone="info">+{row.scopes.length - 4}</Badge> : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-input border border-border px-3 text-sm font-medium text-secondary hover:bg-muted"
            to={`/bac-si/benh-nhan/${row.patientId}`}
          >
            <Eye className="h-4 w-4" />
            Xem
          </Link>
          {row.accessStatus === "expired" ? (
            <Button leftIcon={<ShieldPlus className="h-4 w-4" />} onClick={() => requestAgain(row.patientId)} size="sm" variant="success">
              Xin lại
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell role="doctor" title="Quản lý bệnh nhân">
      <div className="space-y-6">
        <Card padding="lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-secondary">Bệnh nhân đã được cấp quyền</h2>
              <p className="text-sm text-mutedForeground">Bao gồm các quyền đã hết hạn để bác sĩ có thể xin lại khi cần.</p>
            </div>
            <Button disabled={isLoading} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadManagedPatients().catch(() => undefined)} variant="outline">
              Tải lại
            </Button>
          </div>
        </Card>
        {error ? <p className="text-sm text-emergency">{error}</p> : null}
        <DataTable
          columns={columns}
          emptyDescription="Chưa có bệnh nhân nào từng cấp quyền cho tài khoản bác sĩ này."
          emptyTitle="Chưa có bệnh nhân"
          getRowKey={(row) => row.patientId}
          rows={managedPatients}
        />
      </div>
    </AppShell>
  );
}
