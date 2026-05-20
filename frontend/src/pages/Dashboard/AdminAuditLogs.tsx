import { useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { mockAuditLogs } from "../../constants/mockData";
import type { AuditLog } from "../../types/admin";
import { formatDateTime } from "../../utils/date";

export function AdminAuditLogs() {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return mockAuditLogs;
    return mockAuditLogs.filter(
      (log) =>
        log.actor.toLowerCase().includes(normalized) ||
        log.action.toLowerCase().includes(normalized) ||
        log.target.toLowerCase().includes(normalized),
    );
  }, [query]);

  const columns: DataTableColumn<AuditLog>[] = [
    { key: "time", header: "Thời gian", render: (row) => formatDateTime(row.createdAt) },
    { key: "actor", header: "Actor", render: (row) => <span className="font-medium text-secondary">{row.actor}</span> },
    { key: "action", header: "Action", render: (row) => row.action },
    { key: "target", header: "Target", render: (row) => row.target },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={row.status === "success" ? "success" : row.status === "warning" ? "pending" : "emergency"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (row) => (
        <code className="rounded bg-muted px-2 py-1 text-xs text-mutedForeground">
          {Object.entries(row.details)
            .map(([key, value]) => `${key}: ${value}`)
            .join("; ")}
        </code>
      ),
    },
  ];

  return (
    <AppShell
      description="Bảng kiểm toán hệ thống mock, filter cục bộ."
      role="admin"
      title="Nhật ký kiểm toán"
    >
      <div className="space-y-6">
        <Card padding="lg">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-card bg-adminBackground p-3 text-adminPrimary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary">Audit logs</h2>
                <p className="text-sm text-mutedForeground">Tìm theo actor, action hoặc target.</p>
              </div>
            </div>
            <FormInput
              icon={<Search className="h-4 w-4" />}
              label="Tìm kiếm"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="REQUEST_ACCESS"
              value={query}
            />
          </div>
        </Card>
        <DataTable columns={columns} getRowKey={(row) => row.id} rows={rows} />
      </div>
    </AppShell>
  );
}
