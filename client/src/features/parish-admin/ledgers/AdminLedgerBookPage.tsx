import { useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailBackLink } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { getLedgerBook, listLedgerPages, uploadLedgerPages } from "@/features/parish-admin/ledgers/api/ledgersApi";
import { LedgerStateMessage } from "@/features/parish-admin/ledgers/LedgerCards";
import { ledgerPageAlt, ledgerSacramentBadgeTone, ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { UploadLedgerPageModal } from "@/features/parish-admin/ledgers/UploadLedgerPageModal";
import { LedgerPageImage } from "@/features/parish-admin/ledgers/LedgerPageImage";
import { useAsync } from "@/hooks/useAsync";
import type { LedgerPage } from "@/features/parish-admin/ledgers/types";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

// Where a page stands. Only baptism pages are read and made into records so far.
type PageState = "records" | "read" | "unread";

function pageState(page: LedgerPage): PageState {
  if (page.recordCount > 0) return "records";
  return page.readAt ? "read" : "unread";
}

const STATE_PILL: Record<PageState, { dot: string; pill: string }> = {
  records: { dot: "bg-admin-green-700", pill: "bg-admin-green-100 text-admin-green-700" },
  read: { dot: "bg-admin-amber-700", pill: "bg-admin-amber-100 text-admin-amber-700" },
  unread: { dot: "bg-admin-ink-faint", pill: "bg-admin-surface-alt text-admin-ink-muted" },
};

function stateLabel(page: LedgerPage) {
  switch (pageState(page)) {
    case "records":
      return page.recordCount === 1 ? "1 record" : `${page.recordCount} records`;
    case "read":
      return "Read, no records";
    default:
      return "Not read yet";
  }
}

type Filter = "all" | "unread" | "read";
const FILTERS: { key: Filter; label: string; match: (p: LedgerPage) => boolean }[] = [
  { key: "all", label: "All pages", match: () => true },
  { key: "unread", label: "Not read yet", match: (p) => pageState(p) === "unread" },
  { key: "read", label: "Read, no records", match: (p) => pageState(p) === "read" },
];

export function AdminLedgerBookPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const canUpload = user?.role === "parish_admin";
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [goTo, setGoTo] = useState("");
  const [goToError, setGoToError] = useState("");

  const { data: book, loading: bookLoading, refetch: refetchBook } = useAsync(
    () => getLedgerBook(parish.id, bookId),
    [parish.id, bookId]
  );
  const { data: pages = [], loading: pagesLoading, refetch: refetchPages } = useAsync(
    () => listLedgerPages(parish.id, bookId),
    [parish.id, bookId]
  );

  if (bookLoading && !book) {
    return (
      <div className="admin-dash mx-auto w-full max-w-[1920px]">
        <RecordDetailBackLink />
        <p className="admin-dash__muted text-admin-body">Loading register book…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="admin-dash mx-auto w-full max-w-[1920px]">
        <RecordDetailBackLink />
        <h1 className="mb-1 text-[1.35rem] font-bold text-[var(--dash-ink)] sm:text-[1.5rem]">Book not found</h1>
        <p className="admin-dash__muted text-admin-body">This register is not available for this parish.</p>
      </div>
    );
  }

  const tracksReading = book.sacramentType === "baptism";
  const loadingPages = pagesLoading && pages.length === 0;
  const readCount = pages.filter((p) => pageState(p) !== "unread").length;
  const recordTotal = pages.reduce((sum, p) => sum + p.recordCount, 0);
  const shown = tracksReading ? pages.filter(FILTERS.find((f) => f.key === filter)!.match) : pages;

  function handleGoTo(e: FormEvent) {
    e.preventDefault();
    const n = Number(goTo);
    if (!pages.some((p) => p.pageNumber === n)) {
      setGoToError(goTo ? `There's no page ${goTo} in this book.` : "Enter a page number.");
      return;
    }
    navigate(`pages/${n}`);
  }

  return (
    <div className="admin-dash mx-auto w-full max-w-[1920px]">
      <RecordDetailBackLink />

      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <AdminBadge tone={ledgerSacramentBadgeTone(book.sacramentType)}>
              {ledgerSacramentLabel(book.sacramentType)}
            </AdminBadge>
            {book.status === "scanning" && <AdminBadge tone="amber">Scanning</AdminBadge>}
          </div>
          <h1 className="text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            {book.title}
          </h1>
          <p className="admin-dash__muted mt-1 text-admin-body">
            {book.volumeLabel} · {ledgerYearRange(book)}
          </p>
        </div>
        {canUpload && <AdminButton onClick={() => setUploadOpen(true)}>Upload pages</AdminButton>}
      </header>

      {pages.length > 0 && (
        <section className="mb-4 rounded-lg border border-admin-border bg-admin-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="text-admin-body text-admin-ink">
              <Stat value={pages.length} label={pages.length === 1 ? "page" : "pages"} />
              {tracksReading && (
                <>
                  <span className="mx-2 text-admin-ink-faint">·</span>
                  <Stat value={readCount} label="read" />
                  <span className="mx-2 text-admin-ink-faint">·</span>
                  <Stat value={recordTotal} label={recordTotal === 1 ? "record made" : "records made"} />
                </>
              )}
            </p>
            <form onSubmit={handleGoTo} className="flex items-center gap-2">
              <label htmlFor="book-go-to" className="text-admin-support text-admin-ink-muted">
                Go to page
              </label>
              <input
                id="book-go-to"
                inputMode="numeric"
                value={goTo}
                onChange={(e) => {
                  setGoTo(e.target.value.replace(/\D/g, ""));
                  setGoToError("");
                }}
                className="h-9 w-16 rounded-md border border-admin-border bg-admin-surface text-center tabular-nums focus:border-admin-green-700 focus:outline-none focus:ring-2 focus:ring-admin-green-100"
              />
              <AdminButton type="submit" variant="secondary" size="sm">
                Go
              </AdminButton>
            </form>
          </div>
          {tracksReading && (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-admin-surface-alt"
              role="progressbar"
              aria-label="Pages read"
              aria-valuemin={0}
              aria-valuemax={pages.length}
              aria-valuenow={readCount}
            >
              <div className="h-full rounded-full bg-admin-green-700" style={{ width: `${(readCount / pages.length) * 100}%` }} />
            </div>
          )}
          {goToError && (
            <p className="mt-2 text-admin-support text-admin-red-700" role="alert">
              {goToError}
            </p>
          )}
        </section>
      )}

      {tracksReading && pages.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Show pages">
          {FILTERS.map((f) => {
            const count = pages.filter(f.match).length;
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={on}
                className={`h-8 rounded-full border px-3 text-admin-support font-medium ${
                  on
                    ? "border-admin-green-700 bg-admin-green-700 text-white"
                    : "border-admin-border bg-admin-surface text-admin-ink hover:bg-admin-surface-alt"
                }`}
              >
                {f.label} <span className={on ? "text-white/80" : "text-admin-ink-muted"}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {loadingPages ? (
        <LedgerStateMessage>Loading scanned pages…</LedgerStateMessage>
      ) : pages.length === 0 ? (
        <LedgerStateMessage>
          This register has no scanned pages yet.
          {canUpload ? " Upload photos of the book to start." : " Ask a parish admin to upload photos of it."}
        </LedgerStateMessage>
      ) : shown.length === 0 ? (
        <LedgerStateMessage>
          {filter === "unread" ? "Every page in this book has been read." : "No pages are read without records."}
        </LedgerStateMessage>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {shown.map((page) => {
            const state = pageState(page);
            return (
              <li key={page.id}>
                <Link
                  to={`pages/${page.pageNumber}`}
                  className="group block overflow-hidden rounded-lg border border-admin-border bg-admin-surface shadow-[var(--shadow-card)] outline-none transition-colors hover:border-admin-green-700/40 focus-visible:ring-2 focus-visible:ring-admin-green-700/40"
                >
                  <div className="relative">
                    <LedgerPageImage
                      parishId={parish.id}
                      pageId={page.id}
                      size="thumb"
                      alt={ledgerPageAlt(book, page)}
                      className="aspect-[4/3] w-full bg-admin-surface-alt object-cover object-top"
                    />
                    <span className="absolute left-2 top-2 rounded-md bg-white/95 px-1.5 py-0.5 text-admin-support font-semibold tabular-nums text-admin-ink shadow-sm">
                      {page.pageNumber}
                    </span>
                  </div>
                  <div className="px-3 py-2.5">
                    {tracksReading ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-admin-label font-medium ${STATE_PILL[state].pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${STATE_PILL[state].dot}`} aria-hidden="true" />
                        {stateLabel(page)}
                      </span>
                    ) : (
                      <span className="text-admin-support text-admin-ink-muted">Page {page.pageNumber}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {uploadOpen && canUpload && (
        <UploadLedgerPageModal
          parishId={parish.id}
          books={[book]}
          defaultBookId={book.id}
          onClose={() => setUploadOpen(false)}
          onSubmit={async (pages, onProgress) => {
            try {
              await uploadLedgerPages(parish.id, pages, onProgress);
            } finally {
              // Pages uploaded before a failure are in the book too.
              refetchPages();
              refetchBook();
            }
          }}
        />
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold tabular-nums">{value}</span> <span className="text-admin-ink-muted">{label}</span>
    </span>
  );
}
