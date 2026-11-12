import { useMemo, useState, type ReactNode } from "react";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { usePaged } from "@/components/ui/usePaged";
import { SkeletonRows } from "@/components/ui/Skeleton";
import "./AdminTable.css";

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Makes the column sortable by clicking its header. Empty values always sort last. */
  sortValue?: (row: T) => string | number | null | undefined;
}

export type SortState = { key: string; dir: "asc" | "desc" };

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  /** Invoice-style card chrome around the table */
  title?: string;
  subtitle?: string;
  toolbar?: ReactNode;
  /** While true and there are no rows yet, grey placeholder rows show instead of the empty message. */
  loading?: boolean;
  /** The sort before anyone clicks a header; without it rows keep the order they came in. */
  defaultSort?: SortState;
  /** Pages the rows, 10 at a time by default; the rows-per-page choice is remembered under this name. */
  pageKey?: string;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compare(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

function SortArrow({ dir }: { dir: "asc" | "desc" | null }) {
  return (
    <svg viewBox="0 0 12 12" className={`admin-table__sort-arrow ${dir ? "is-on" : ""}`} aria-hidden="true">
      <path d="M6 2.5 8.5 5h-5z" className={dir === "desc" ? "is-dim" : ""} />
      <path d="M6 9.5 3.5 7h5z" className={dir === "asc" ? "is-dim" : ""} />
    </svg>
  );
}

export function AdminTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No records found.",
  title,
  subtitle,
  toolbar,
  loading = false,
  defaultSort,
  pageKey,
}: AdminTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !column?.sortValue) return rows;
    const value = column.sortValue;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const emptyA = va == null || va === "";
      const emptyB = vb == null || vb === "";
      if (emptyA || emptyB) return Number(emptyA) - Number(emptyB);
      return sign * compare(va, vb);
    });
  }, [rows, columns, sort]);

  const { pageRows, pager } = usePaged(sorted, pageKey);

  function toggleSort(key: string) {
    setSort((current) => (current?.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const showSkeleton = loading && rows.length === 0;
  const table = rows.length === 0 && !showSkeleton ? (
    <div className="admin-table__empty">{emptyMessage}</div>
  ) : (
    <>
      <div className="admin-table__scroll">
        <table className="admin-table__grid">
          <thead>
            <tr>
              {columns.map((col) => {
                const dir = sort?.key === col.key ? sort.dir : null;
                return (
                  <th
                    key={col.key}
                    className={col.className}
                    aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                  >
                    {col.sortValue ? (
                      <button type="button" className="admin-table__sort" onClick={() => toggleSort(col.key)}>
                        {col.header}
                        <SortArrow dir={dir} />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {showSkeleton && <SkeletonRows cols={columns.length} />}
            {pageRows.map((row) => (
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
      {pager && <AdminPagination {...pager} />}
    </>
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
