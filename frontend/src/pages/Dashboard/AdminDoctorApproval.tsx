import { useEffect } from "react";
import { Check, Clock, FileCheck, Timer, UserCheck, X } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { StatCard } from "../../components/StatCard";
import { useAdminStore } from "../../store/adminStore";
import type { DoctorApproval } from "../../types/admin";
import { formatDateTime } from "../../utils/date";

function isPending(status: DoctorApproval["status"]) {
  return status === "pending_verification" || status === "pending";
}

export function AdminDoctorApproval() {
  const rows = useAdminStore((state) => state.pendingDoctors);
  const loadPendingDoctors = useAdminStore((state) => state.loadPendingDoctors);
  const verifyDoctor = useAdminStore((state) => state.verifyDoctor);
  const error = useAdminStore((state) => state.error);

  useEffect(() => {
    void loadPendingDoctors().catch(() => undefined);
  }, [loadPendingDoctors]);

  function updateStatus(id: string, status: DoctorApproval["status"]) {
    void verifyDoctor(id, { action: status === "rejected" ? "rejected" : "approved", note: "" }).catch(() => undefined);
  }

  const columns: DataTableColumn<DoctorApproval>[] = [
    { key: "name", header: "Bác sĩ", render: (row) => <span className="font-medium text-secondary">{row.fullName}</span> },
    { key: "specialty", header: "Chuyên khoa", render: (row) => row.specialty },
    { key: "email", header: "Email", render: (row) => row.email },
    { key: "license", header: "Giấy phép", render: (row) => row.licenseNumber },
    { key: "registered", header: "Đăng ký", render: (row) => formatDateTime(row.registeredAt) },
    {
      key: "status",
      header: "Trạng thái",
      render: (row) => (
        <Badge tone={row.status === "approved" ? "success" : row.status === "rejected" ? "emergency" : "pending"}>
          {row.status === "approved" ? "Đã duyệt" : row.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (row) => (
        <div className="flex gap-2">
          <Button onClick={() => updateStatus(row.id, "approved")} size="sm" variant="success">
            <Check className="h-4 w-4" />
          </Button>
          <Button onClick={() => updateStatus(row.id, "rejected")} size="sm" variant="danger">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell role="admin" title="Phê duyệt bác sĩ">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Clock} label="Chờ duyệt" tone="admin" value={`${rows.filter((row) => isPending(row.status)).length}`} />
          <StatCard icon={UserCheck} label="Đã duyệt" tone="success" value={`${rows.filter((row) => row.status === "approved").length}`} />
          <StatCard icon={FileCheck} label="Từ chối" tone="danger" value={`${rows.filter((row) => row.status === "rejected").length}`} />
          <StatCard icon={Timer} label="Tổng hồ sơ" tone="warning" value={`${rows.length}`} />
        </section>
        {error ? <p className="text-sm text-emergency">{error}</p> : null}
        <DataTable columns={columns} getRowKey={(row) => row.id} rows={rows} />
      </div>
    </AppShell>
  );
}
