import { useId } from "react";
import { PAGE_SIZES } from "@/components/ui/usePaged";

/*
 * The pager under a table: rows per page (10 by default, remembered per table on this
 * browser), "1–10 of 34", and page buttons. usePaged() pages the list itself.
 */

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export function AdminPagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems }: AdminPaginationProps) {
  const id = useId();
  // Nothing to page and nothing worth choosing: show nothing.
  if (totalItems <= PAGE_SIZES[0]) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);
  const stepClass =
    "inline-flex items-center gap-1.5 rounded-full border border-admin-border px-3.5 py-1.5 text-admin-support text-admin-ink-muted transition hover:bg-admin-surface-alt disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Pages"
      className="flex flex-col gap-3 border-t border-admin-border px-5 py-3.5 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-admin-support text-admin-ink-muted">
        <span aria-live="polite">
          <span className="font-medium text-admin-ink">
            {first}–{last}
          </span>{" "}
          of {totalItems}
        </span>
        <label htmlFor={id} className="inline-flex items-center gap-2">
          Rows per page
          <select
            id={id}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-admin-border bg-white px-2 py-1 text-admin-support text-admin-ink outline-none focus:border-admin-green-700 focus:ring-[3px] focus:ring-admin-green-100"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 md:justify-end">
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} className={stepClass}>
            <span aria-hidden="true">←</span> Previous
          </button>
          <div className="hidden items-center gap-1 sm:flex">
            {pageNumbers(page, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`gap-${i}`} className="px-2 text-admin-support text-admin-ink-faint" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => onPageChange(n)}
                  aria-label={`Page ${n}`}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-admin-support transition ${
                    n === page ? "bg-admin-green-050 font-semibold text-admin-green-900" : "text-admin-ink-muted hover:bg-admin-surface-alt"
                  }`}
                >
                  {n}
                </button>
              )
            )}
          </div>
          <span className="text-admin-support text-admin-ink-muted sm:hidden">
            Page {page} of {totalPages}
          </span>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className={stepClass}>
            Next <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </nav>
  );
}
