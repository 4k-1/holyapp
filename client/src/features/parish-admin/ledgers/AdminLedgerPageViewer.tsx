import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailBackLink } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { deleteLedgerPage, getLedgerBook, listLedgerPages } from "@/features/parish-admin/ledgers/api/ledgersApi";
import { LedgerPageImage } from "@/features/parish-admin/ledgers/LedgerPageImage";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { ledgerPageAlt, ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

export function AdminLedgerPageViewer() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  const { bookId = "", pageNumber: pageNumberParam = "" } = useParams();
  const pageNumber = Number(pageNumberParam);
  const user = useCurrentUser();
  const isAdmin = user?.role === "parish_admin";
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

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

  const [prevPageNumber, setPrevPageNumber] = useState(pageNumber);
  if (pageNumber !== prevPageNumber) {
    setPrevPageNumber(pageNumber);
    setJumpValue(String(pageNumber || ""));
    setJumpError("");
  }

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
      <div className="admin-dash mx-auto w-full max-w-[1920px]">
        <RecordDetailBackLink />
        <p className="admin-dash__muted text-admin-body">Loading scanned page…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="admin-dash mx-auto w-full max-w-[1920px]">
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
      <div className="admin-dash mx-auto w-full max-w-[1920px]">
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
  const recordsLabel =
    page.recordCount > 0
      ? ` · ${page.recordCount === 1 ? "1 record" : `${page.recordCount} records`} made from this page`
      : page.readAt
        ? " · read, no records yet"
        : "";

  async function removePage() {
    if (!page) return;
    setRemoving(true);
    setRemoveError("");
    try {
      await deleteLedgerPage(parish.id, page.id);
      navigate("../..", { relative: "path" });
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Couldn't remove this page.");
      setRemoving(false);
    }
  }

  return (
    <div className="admin-dash mx-auto w-full max-w-[1920px]">
      <RecordDetailBackLink />

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1.5 text-[0.75rem] font-medium tracking-[0.01em] text-[var(--dash-ink-soft)]">
            {ledgerSacramentLabel(book.sacramentType)} · {ledgerYearRange(book)}
          </p>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            {book.title}, page {page.pageNumber}
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">
            {positionLabel}
            {recordsLabel}
          </p>
          {book.sacramentType === "baptism" && (
            <Link
              to="records"
              className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-transparent bg-admin-green-700 px-4 py-2.5 text-admin-body font-medium text-white shadow-[var(--shadow-button)] hover:bg-admin-green-600"
            >
              {page.recordCount > 0 || page.readAt ? "Make records from this page" : "Read page and make records"}
            </Link>
          )}
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
        <LedgerPageImage
          parishId={parish.id}
          pageId={page.id}
          alt={ledgerPageAlt(book, page)}
          className="mx-auto block min-h-[16rem] w-full max-w-[1400px] bg-[#f4efe6]"
        />
      </AdminCard>

      {isAdmin && (
        <p className="mt-4 text-admin-support text-admin-ink-muted">
          Wrong photo?{" "}
          <button
            type="button"
            onClick={() => setRemoveOpen(true)}
            className="font-semibold text-admin-red-700 hover:underline"
          >
            Remove this page
          </button>
        </p>
      )}

      {removeOpen && (
        <AdminDialog onClose={() => setRemoveOpen(false)} busy={removing} panelClassName="max-w-[460px]">
          <AdminDialogHeader
            title={`Remove page ${page.pageNumber}?`}
            subtitle="The photo and its reading are deleted. This can't be undone."
            onClose={() => setRemoveOpen(false)}
            busy={removing}
          />
          <div className="px-5 py-4 text-admin-body text-admin-ink">
            {page.recordCount > 0
              ? `The ${page.recordCount === 1 ? "record" : `${page.recordCount} records`} made from this page stay, but will no longer link to its photo.`
              : "No records have been made from this page."}
            {removeError && <p className="mt-3 text-admin-support text-admin-red-700">{removeError}</p>}
          </div>
          <AdminDialogFooter>
            <AdminButton variant="secondary" onClick={() => setRemoveOpen(false)} disabled={removing}>
              Keep page
            </AdminButton>
            <AdminButton variant="danger" onClick={removePage} disabled={removing}>
              {removing ? "Removing…" : "Remove page"}
            </AdminButton>
          </AdminDialogFooter>
        </AdminDialog>
      )}
    </div>
  );
}
