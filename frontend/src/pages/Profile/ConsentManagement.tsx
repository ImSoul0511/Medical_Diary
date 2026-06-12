import { useEffect, useState } from "react";
import { Building2, Check, Shield, Stethoscope, X } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { consentScopeLabels } from "../../constants/consentScopes";
import { useConsent } from "../../hooks/useConsent";
import { useUserStore } from "../../store/userStore";
import type { AccessHistoryItem } from "../../types/users";
import { formatDate, formatDateTime } from "../../utils/date";

function formatAccessLog(row: AccessHistoryItem): string {
  const doctor = row.doctorName || "Bác sĩ";
  const actionText = (row.action || "").toUpperCase();
  const typeText = (row.dataType || "").toLowerCase();
  
  if (actionText === "INSERT" || actionText === "CREATE") {
    if (typeText.includes("prescription")) {
      return `Bác sĩ ${doctor} đã kê đơn thuốc mới.`;
    }
    if (typeText.includes("medical_record")) {
      return `Bác sĩ ${doctor} đã tạo hồ sơ bệnh án mới.`;
    }
    return `Bác sĩ ${doctor} đã thêm dữ liệu ${typeText}.`;
  }
  
  if (actionText === "SELECT" || actionText === "READ") {
    if (typeText.includes("prescription")) {
      return `Bác sĩ ${doctor} đã xem danh sách đơn thuốc của bạn.`;
    }
    if (typeText.includes("medical_record")) {
      return `Bác sĩ ${doctor} đã xem hồ sơ bệnh án của bạn.`;
    }
    if (typeText.includes("diary") || typeText.includes("diaries")) {
      return `Bác sĩ ${doctor} đã xem nhật ký triệu chứng của bạn.`;
    }
    if (
      typeText.includes("health_metric") || 
      typeText.includes("heart_rate") || 
      typeText.includes("step_count") || 
      typeText.includes("respiratory_rate")
    ) {
      return `Bác sĩ ${doctor} đã xem chỉ số sức khỏe của bạn.`;
    }
    if (typeText.includes("profile") || typeText.includes("users")) {
      return `Bác sĩ ${doctor} đã xem thông tin cá nhân của bạn.`;
    }
    if (typeText.includes("blood_type")) {
      return `Bác sĩ ${doctor} đã xem thông tin nhóm máu của bạn.`;
    }
    if (typeText.includes("allergies")) {
      return `Bác sĩ ${doctor} đã xem thông tin dị ứng của bạn.`;
    }
    if (typeText.includes("emergency_contact")) {
      return `Bác sĩ ${doctor} đã xem liên hệ khẩn cấp của bạn.`;
    }
    return `Bác sĩ ${doctor} đã xem dữ liệu ${typeText} của bạn.`;
  }

  if (actionText === "UPDATE") {
    if (typeText.includes("prescription")) {
      return `Bác sĩ ${doctor} đã cập nhật đơn thuốc của bạn.`;
    }
    if (typeText.includes("medical_record")) {
      return `Bác sĩ ${doctor} đã chỉnh sửa hồ sơ bệnh án của bạn.`;
    }
    return `Bác sĩ ${doctor} đã cập nhật dữ liệu ${typeText} của bạn.`;
  }

  if (actionText === "DELETE") {
    if (typeText.includes("prescription")) {
      return `Bác sĩ ${doctor} đã hủy/xóa đơn thuốc của bạn.`;
    }
    if (typeText.includes("medical_record")) {
      return `Bác sĩ ${doctor} đã xóa hồ sơ bệnh án của bạn.`;
    }
    return `Bác sĩ ${doctor} đã xóa dữ liệu ${typeText} của bạn.`;
  }

  return `Bác sĩ ${doctor} đã thao tác trên dữ liệu của bạn.`;
}

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

  const accessHistory = useUserStore((state) => state.accessHistory);
  const loadAccessHistory = useUserStore((state) => state.loadAccessHistory);

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState<any | null>(null);
  const [allowedScopes, setAllowedScopes] = useState<Record<string, boolean>>({});

  function handleOpenApproveModal(request: any) {
    setTargetRequest(request);
    const initialScopes: Record<string, boolean> = {};
    request.requestedScopes.forEach((scope: string) => {
      initialScopes[scope] = true;
    });
    setAllowedScopes(initialScopes);
    setIsApproveModalOpen(true);
  }

  function handleConfirmApprove() {
    if (!targetRequest) return;
    const scopesToApprove = Object.keys(allowedScopes).filter((key) => allowedScopes[key]);
    if (scopesToApprove.length === 0) {
      alert("Vui lòng chọn ít nhất một quyền truy cập để đồng ý.");
      return;
    }
    void approveRequest(targetRequest.id, scopesToApprove as any)
      .then(() => {
        setIsApproveModalOpen(false);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    void loadAccessRequests().catch(() => undefined);
    void loadHistory().catch(() => undefined);
    void loadAccessHistory().catch(() => undefined);
  }, [loadAccessRequests, loadHistory, loadAccessHistory]);

  const accessHistoryColumns: DataTableColumn<AccessHistoryItem>[] = [
    {
      key: "activity",
      header: "Nội dung hoạt động",
      render: (row) => <span className="font-semibold text-secondary">{formatAccessLog(row)}</span>,
    },
    {
      key: "date",
      header: "Thời điểm",
      render: (row) => <span className="text-mutedForeground text-xs">{formatDateTime(row.accessedAt)}</span>,
    },
    // old column 1
    // old column 2
    // old column 3
    // old column 4
  ];

  return (
    <AppShell role="user" title="Quản lý cấp quyền">
      <div className="space-y-6">
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
                    onClick={() => handleOpenApproveModal(request)}
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-secondary">Lịch sử truy cập</h2>
        <DataTable
          columns={accessHistoryColumns}
          emptyDescription="Chưa có bản ghi truy cập nào."
          emptyTitle="Chưa có lịch sử truy cập"
          getRowKey={(row) => `${row.id}-${row.accessedAt}-${row.action}`}
          rows={accessHistory}
        />
      </section>
    </div>
      <Modal
        open={isApproveModalOpen}
        title="Chấp nhận yêu cầu truy cập"
        confirmLabel="Đồng ý cấp quyền"
        confirmVariant="success"
        onConfirm={handleConfirmApprove}
        onClose={() => setIsApproveModalOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Bác sĩ <span className="font-semibold">{targetRequest?.doctorName}</span> đang yêu cầu truy cập các thông tin sau. Bạn có thể bỏ chọn các quyền không muốn chia sẻ:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-border/40 rounded-card p-3 bg-slate-50/50">
            {targetRequest?.requestedScopes.map((scope: string) => (
              <label key={scope} className="flex items-center gap-2 text-sm text-secondary hover:bg-muted/40 p-1.5 rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  checked={!!allowedScopes[scope]}
                  onChange={(e) => setAllowedScopes((prev) => ({ ...prev, [scope]: e.target.checked }))}
                />
                <span>{consentScopeLabels[scope as keyof typeof consentScopeLabels] || scope}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
