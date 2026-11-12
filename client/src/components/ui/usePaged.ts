import { useCallback, useState } from "react";

/** Pages a list in the browser for AdminPagination, remembering rows per page for each table. */

export const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_SIZE = 10;

function readSize(storageKey: string): number {
  try {
    const saved = Number(localStorage.getItem(storageKey));
    if ((PAGE_SIZES as readonly number[]).includes(saved)) return saved;
  } catch {
    /* storage may be blocked; the default is fine */
  }
  return DEFAULT_SIZE;
}

/** Pages a list in the browser. A shorter list never leaves you on an empty page. */
export function usePaged<T>(rows: T[], table: string | undefined) {
  const storageKey = `holyapp.pageSize.${table}`;
  const [pageSize, setPageSizeState] = useState(() => (table ? readSize(storageKey) : Infinity));
  const [requestedPage, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      setPage(1);
      try {
        localStorage.setItem(storageKey, String(size));
      } catch {
        /* not remembered, still applied */
      }
    },
    [storageKey]
  );

  if (!table) return { pageRows: rows, pager: null };
  const start = (page - 1) * pageSize;
  return {
    pageRows: rows.slice(start, start + pageSize),
    pager: { page, totalPages, onPageChange: setPage, pageSize, onPageSizeChange: setPageSize, totalItems: rows.length },
  };
}
