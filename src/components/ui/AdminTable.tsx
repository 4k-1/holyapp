import type { ReactNode } from "react";

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
}

export function AdminTable<T>({ columns, rows, getRowKey, emptyMessage = "No records found." }: AdminTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">{emptyMessage}</div>
    );
  }

  return (
    <table className="w-full border-collapse text-admin-body">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th
              key={col.key}
              className={`border-b border-admin-border bg-admin-surface-alt px-4 py-[11px] text-left text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted ${
                i === 0 ? "rounded-tl-[var(--radius)]" : ""
              } ${i === columns.length - 1 ? "rounded-tr-[var(--radius)]" : ""} ${col.className ?? ""}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)} className="transition-colors hover:bg-admin-green-050">
            {columns.map((col) => (
              <td
                key={col.key}
                className="border-b border-admin-border px-4 py-[13px] text-admin-ink last:border-b-0 [tr:last-child_&]:border-b-0"
              >
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}