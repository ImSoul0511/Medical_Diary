import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Card } from "../../components/Card";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FormInput } from "../../components/FormInput";
import { useAdminStore } from "../../store/adminStore";
import type { AuditLog } from "../../types/admin";
import { formatDateTime } from "../../utils/date";

function summarizeData(value: Record<string, unknown> | null) {
  if (!value) return "";
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join("; ");
}

export function AdminAuditLogs() {
  const [query, setQuery] = useState("");
  const auditLogs = useAdminStore((state) => state.auditLogs);
  const loadAuditLogs = useAdminStore((state) => state.loadAuditLogs);
  const error = useAdminStore((state) => state.error);
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return auditLogs;
    return auditLogs.filter(
      (log) =>
        log.actorName.toLowerCase().includes(normalized) ||
        log.actorId.toLowerCase().includes(normalized) ||
        log.action.toLowerCase().includes(normalized) ||
        log.tableName.toLowerCase().includes(normalized) ||
        (log.targetUserId ?? "").toLowerCase().includes(normalized),
    );
  }, [auditLogs, query]);

  useEffect(() => {
    void loadAuditLogs().catch(() => undefined);
  }, [loadAuditLogs]);

  const columns: DataTableColumn<AuditLog>[] = [
    { key: "time", header: "Thời gian", render: (row) => formatDateTime(row.createdAt) },
    { key: "actor", header: "Người thực hiện", render: (row) => <span className="font-medium text-secondary">{row.actorName || row.actorId}</span> },
    { key: "action", header: "Hành động", render: (row) => row.action },
    { key: "table", header: "Bảng", render: (row) => row.tableName },
    { key: "target", header: "Đối tượng", render: (row) => row.targetUserId ?? "--" },
    {
      key: "details",
      header: "Chi tiết",
      render: (row) => (
        <code className="rounded bg-muted px-2 py-1 text-xs text-mutedForeground">
          {summarizeData(row.newData) || summarizeData(row.oldData) || "--"}
        </code>
      ),
    },
  ];

  return (
    <AppShell role="admin" title="Nhật ký kiểm toán">
      <div className="space-y-6">
        <Card padding="lg">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-card bg-adminBackground p-3 text-adminPrimary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary">Danh sách nhật ký</h2>
                <p className="text-sm text-mutedForeground">Tìm theo người thực hiện, hành động, bảng hoặc đối tượng.</p>
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
          {error ? <p className="mt-3 text-sm text-emergency">{error}</p> : null}
        </Card>
        <DataTable columns={columns} getRowKey={(row) => row.id} rows={rows} />
      </div>
    </AppShell>
  );
}
