import { Check, Clock, FileCheck, Timer, UserCheck, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { StatCard } from "../../components/StatCard";
import { mockDoctorApprovals } from "../../constants/mockData";
import type { DoctorApproval } from "../../types/admin";
import { formatDateTime } from "../../utils/date";

export function AdminDoctorApproval() {
  const [rows, setRows] = useState(mockDoctorApprovals);

  function updateStatus(id: string, status: DoctorApproval["status"]) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  const columns: DataTableColumn<DoctorApproval>[] = [
    { key: "name", header: "Bác sĩ", render: (row) => <span className="font-medium text-secondary">{row.fullName}</span> },
    { key: "specialty", header: "Chuyên khoa", render: (row) => row.specialty },
    { key: "hospital", header: "Bệnh viện", render: (row) => row.hospital },
    { key: "license", header: "Giấy phép", render: (row) => row.licenseNumber },
    { key: "submitted", header: "Gửi lúc", render: (row) => formatDateTime(row.submittedAt) },
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
    <AppShell
      description="Duyệt hồ sơ bác sĩ bằng local state, chưa gọi admin endpoint."
      role="admin"
      title="Phê duyệt bác sĩ"
    >
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Clock} label="Chờ duyệt" tone="admin" value={`${rows.filter((row) => row.status === "pending").length}`} />
          <StatCard icon={UserCheck} label="Đã duyệt" tone="success" value={`${rows.filter((row) => row.status === "approved").length}`} />
          <StatCard icon={FileCheck} label="Từ chối" tone="danger" value={`${rows.filter((row) => row.status === "rejected").length}`} />
          <StatCard icon={Timer} label="Thời gian xử lý" tone="warning" unit="giờ" value="4.2" />
        </section>
        <DataTable columns={columns} getRowKey={(row) => row.id} rows={rows} />
      </div>
    </AppShell>
  );
}
