import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  emptyTitle = "Không có dữ liệu",
  emptyDescription = "Bảng này chưa có bản ghi phù hợp.",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-mutedForeground">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3 font-semibold" key={column.key}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr className="hover:bg-muted/60" key={getRowKey(row)}>
                {columns.map((column) => (
                  <td className={`px-4 py-3 ${column.className ?? ""}`} key={column.key}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
