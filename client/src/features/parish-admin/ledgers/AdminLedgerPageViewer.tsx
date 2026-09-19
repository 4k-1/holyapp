import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailBackLink } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { getLedgerBook, listLedgerPages } from "@/features/parish-admin/ledgers/api/ledgersApi";
import { ledgerPageAlt, ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

export function AdminLedgerPageViewer() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  const { bookId = "", pageNumber: pageNumberParam = "" } = useParams();
  const pageNumber = Number(pageNumberParam);

  const { data: book, loading: bookLoading } = useAsync(
    () => getLedgerBook(parish.id, bookId),
    [parish.id, bookId]
  );
  const { data: pages = [], loading: pagesLoading } = useAsync(
    () => listLedgerPages(parish.id, bookId),
    [parish.id, bookId]
  );

  const pageIndex = useMemo(
    () => pages.findIndex((p) => p.pageNumber === pageNumber),
    [pages, pageNumber]
  );
  const page = pageIndex >= 0 ? pages[pageIndex] : undefined;
  const prevPage = pageIndex > 0 ? pages[pageIndex - 1] : undefined;
  const nextPage = pageIndex >= 0 && pageIndex < pages.length - 1 ? pages[pageIndex + 1] : undefined;

  const [jumpValue, setJumpValue] = useState(String(pageNumber || ""));
  const [jumpError, setJumpError] = useState("");

  useEffect(() => {
    setJumpValue(String(pageNumber || ""));
    setJumpError("");
  }, [pageNumber]);

  function goToPageNumber(n: number) {
    navigate(`../${n}`, { relative: "path" });
  }

  function handleJump(e: FormEvent) {
    e.preventDefault();
    const n = Number(jumpValue);
    if (!Number.isInteger(n) || n < 1) {
      setJumpError("Enter a page number.");
      return;
    }
    const exists = pages.some((p) => p.pageNumber === n);
    if (!exists) {
      setJumpError(`Page ${n} is not in this book.`);
      return;
    }
    setJumpError("");
    goToPageNumber(n);
  }

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (e.key === "ArrowLeft" && prevPage) {
        e.preventDefault();
        navigate(`../${prevPage.pageNumber}`, { relative: "path" });
      }
      if (e.key === "ArrowRight" && nextPage) {
        e.preventDefault();
        navigate(`../${nextPage.pageNumber}`, { relative: "path" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, prevPage, nextPage]);

  if ((bookLoading && !book) || (pagesLoading && pages.length === 0 && !page)) {
    return (
      <div className="admin-dash mx-auto max-w-[1180px]">
        <RecordDetailBackLink />
        <p className="admin-dash__muted text-admin-body">Loading scanned page…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="admin-dash mx-auto max-w-[1180px]">
        <RecordDetailBackLink />
        <h1 className="mb-1 font-serif text-[1.35rem] font-bold text-[var(--dash-ink)] sm:text-[1.5rem]">
          Book not found
        </h1>
        <p className="admin-dash__muted text-admin-body">This register is not available for this parish.</p>
      </div>
    );
  }

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || !page) {
    return (
      <div className="admin-dash mx-auto max-w-[1180px]">
        <RecordDetailBackLink />
        <h1 className="mb-1 font-serif text-[1.35rem] font-bold text-[var(--dash-ink)] sm:text-[1.5rem]">
          Page not found
        </h1>
        <p className="admin-dash__muted text-admin-body">
          Page {pageNumberParam || "—"} is not in {book.title}.
        </p>
      </div>
    );
  }

  const positionLabel =
    pages.length > 0 ? `${pageIndex + 1} of ${pages.length} digitized pages` : "1 page";

  return (
    <div className="admin-dash mx-auto max-w-[1180px]">
      <RecordDetailBackLink />

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1.5 text-[0.75rem] font-medium tracking-[0.01em] text-[var(--dash-ink-soft)]">
            {ledgerSacramentLabel(book.sacramentType)} · {ledgerYearRange(book)}
          </p>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            {book.title}, page {page.pageNumber}
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">{positionLabel}</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <AdminButton
            variant="secondary"
            onClick={() => prevPage && goToPageNumber(prevPage.pageNumber)}
            disabled={!prevPage}
            aria-label="Previous page"
            className="!rounded-[10px]"
          >
            ← Previous
          </AdminButton>
          <form onSubmit={handleJump} className="flex items-end gap-2">
            <AdminField label="Jump to page" className="mb-0">
              <AdminInput
                type="number"
                min={1}
                className="w-[96px]"
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                aria-label="Page number"
              />
            </AdminField>
            <AdminButton type="submit" variant="secondary" className="!rounded-[10px]">
              Go
            </AdminButton>
          </form>
          <AdminButton
            variant="secondary"
            onClick={() => nextPage && goToPageNumber(nextPage.pageNumber)}
            disabled={!nextPage}
            aria-label="Next page"
            className="!rounded-[10px]"
          >
            Next →
          </AdminButton>
        </div>
      </header>

      {jumpError && (
        <p className="mb-4 text-admin-support text-admin-red-700" role="alert">
          {jumpError}
        </p>
      )}

      <p className="mb-4 text-admin-support text-[var(--dash-ink-faint)]">Use ← and → to move between pages.</p>

      <AdminCard className="overflow-hidden p-0">
        <img
          src={page.imageUrl}
          alt={ledgerPageAlt(book, page)}
          className="mx-auto block w-full max-w-[920px] bg-[#f4efe6]"
        />
      </AdminCard>
    </div>
  );
}
