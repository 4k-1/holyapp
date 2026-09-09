import type { ReactNode } from "react";
import "./AdminTable.css";

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
  /** Invoice-style card chrome around the table */
  title?: string;
  subtitle?: string;
  toolbar?: ReactNode;
}

export function AdminTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No records found.",
  title,
  subtitle,
  toolbar,
}: AdminTableProps<T>) {
  const table = rows.length === 0 ? (
    <div className="admin-table__empty">{emptyMessage}</div>
  ) : (
    <div className="admin-table__scroll">
      <table className="admin-table__grid">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!title && !toolbar) {
    return <div className="admin-table">{table}</div>;
  }

  return (
    <div className="admin-table admin-table--card">
      <div className="admin-table__toolbar">
        <div className="admin-table__heading min-w-0">
          {title ? <h2 className="admin-table__title">{title}</h2> : null}
          {title && subtitle ? <span className="admin-table__sep" aria-hidden="true" /> : null}
          {subtitle ? <p className="admin-table__subtitle">{subtitle}</p> : null}
        </div>
        {toolbar ? <div className="admin-table__toolbar-end">{toolbar}</div> : null}
      </div>
      {table}
    </div>
  );
}
