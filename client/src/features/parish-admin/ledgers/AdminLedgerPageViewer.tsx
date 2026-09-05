import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailBackLink } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { getLedgerBook, listLedgerPages } from "@/features/parish-admin/ledgers/api/ledgersApi";
import { ledgerPageAlt, ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";

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
      <div>
        <RecordDetailBackLink />
        <p className="text-admin-body text-admin-ink-muted">Loading scanned page…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div>
        <RecordDetailBackLink />
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Book not found</h1>
        <p className="text-admin-body text-admin-ink-muted">This register is not available for this parish.</p>
      </div>
    );
  }

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || !page) {
    return (
      <div>
        <RecordDetailBackLink />
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Page not found</h1>
        <p className="text-admin-body text-admin-ink-muted">
          Page {pageNumberParam || "—"} is not in {book.title}.
        </p>
      </div>
    );
  }

  const positionLabel =
    pages.length > 0 ? `${pageIndex + 1} of ${pages.length} digitized pages` : "1 page";

  return (
    <div>
      <RecordDetailBackLink />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
            {ledgerSacramentLabel(book.sacramentType)} · {ledgerYearRange(book)}
          </p>
          <h1 className="mb-1 font-serif text-admin-page font-semibold leading-tight text-admin-ink">
            {book.title}, page {page.pageNumber}
          </h1>
          <p className="text-admin-body text-admin-ink-muted">{positionLabel}</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <AdminButton
            variant="secondary"
            onClick={() => prevPage && goToPageNumber(prevPage.pageNumber)}
            disabled={!prevPage}
            aria-label="Previous page"
          >
            ← Previous
          </AdminButton>
          <form onSubmit={handleJump} className="flex items-end gap-2">
            <label className="block">
              <span className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                Jump to page
              </span>
              <AdminInput
                type="number"
                min={1}
                className="w-[88px]"
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                aria-label="Page number"
              />
            </label>
            <AdminButton type="submit" variant="secondary">
              Go
            </AdminButton>
          </form>
          <AdminButton
            variant="secondary"
            onClick={() => nextPage && goToPageNumber(nextPage.pageNumber)}
            disabled={!nextPage}
            aria-label="Next page"
          >
            Next →
          </AdminButton>
        </div>
      </div>

      {jumpError && (
        <p className="mb-3 text-admin-support text-admin-red-700" role="alert">
          {jumpError}
        </p>
      )}

      <p className="mb-3 text-admin-label text-admin-ink-faint">Use ← and → to move between pages.</p>

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
