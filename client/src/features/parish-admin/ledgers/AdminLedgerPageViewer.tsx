// One scanned register page, laid out like the archive viewers (FamilySearch, Ancestry, Mirador):
// a slim toolbar, the scan filling the screen with zoom and drag, the records made from the page
// beside it, and the neighbouring pages in a strip below.
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminBackLink } from "@/features/parish-admin/components/AdminBackLink";
import { RecordDetailBackLink } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { AdminRowActions } from "@/components/ui/AdminRowActions";
import { deleteLedgerPage, getLedgerBook, listLedgerPages } from "@/features/parish-admin/ledgers/api/ledgersApi";
import { getLedgerPageReading } from "@/features/parish-admin/ledgers/api/ledgerScanApi";
import { LedgerPageImage } from "@/features/parish-admin/ledgers/LedgerPageImage";
import { useLedgerPageImage } from "@/features/parish-admin/ledgers/useLedgerPageImage";
import { ZoomableScan } from "@/features/parish-admin/ledgers/ZoomableScan";
import { NO_ADJUST, type ScanAdjust } from "@/features/parish-admin/ledgers/scanAdjust";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { ledgerPageAlt, ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { formatTableDate } from "@/lib/dates";
import { useAsync } from "@/hooks/useAsync";
import type { LedgerBook, LedgerPage } from "@/features/parish-admin/ledgers/types";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

/** Pages shown either side of this one in the strip below the scan. */
const STRIP_REACH = 6;

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

  const pageIndex = useMemo(() => pages.findIndex((p) => p.pageNumber === pageNumber), [pages, pageNumber]);
  const page = pageIndex >= 0 ? pages[pageIndex] : undefined;
  const prevPage = pageIndex > 0 ? pages[pageIndex - 1] : undefined;
  const nextPage = pageIndex >= 0 && pageIndex < pages.length - 1 ? pages[pageIndex + 1] : undefined;

  const goToPageNumber = useCallback((n: number) => navigate(`../${n}`, { relative: "path" }), [navigate]);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      if (e.key === "ArrowLeft" && prevPage) {
        e.preventDefault();
        goToPageNumber(prevPage.pageNumber);
      }
      if (e.key === "ArrowRight" && nextPage) {
        e.preventDefault();
        goToPageNumber(nextPage.pageNumber);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToPageNumber, prevPage, nextPage]);

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
        <h1 className="mb-1 text-[1.35rem] font-bold text-[var(--dash-ink)] sm:text-[1.5rem]">Book not found</h1>
        <p className="admin-dash__muted text-admin-body">This register is not available for this parish.</p>
      </div>
    );
  }

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || !page) {
    return (
      <div className="admin-dash mx-auto w-full max-w-[1920px]">
        <RecordDetailBackLink />
        <h1 className="mb-1 text-[1.35rem] font-bold text-[var(--dash-ink)] sm:text-[1.5rem]">Page not found</h1>
        <p className="admin-dash__muted text-admin-body">
          Page {pageNumberParam || "—"} is not in {book.title}.
        </p>
      </div>
    );
  }

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

  const canMakeRecords = book.sacramentType === "baptism";

  return (
    <div className="admin-dash mx-auto flex h-[calc(100dvh-7.5rem)] min-h-[560px] w-full max-w-[1920px] flex-col">
      <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <AdminBackLink className="" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.125rem] font-bold leading-tight text-[var(--dash-ink)]">{book.title}</h1>
          <p className="admin-dash__muted text-admin-support">
            {ledgerSacramentLabel(book.sacramentType)} · {ledgerYearRange(book)}
          </p>
        </div>
        {canMakeRecords && (
          <Link
            to="records"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-admin-green-700 px-4 py-2 text-admin-body font-medium text-white shadow-[var(--shadow-button)] hover:bg-admin-green-600"
          >
            {page.recordCount > 0 || page.readAt ? "Make records from this page" : "Read page and make records"}
          </Link>
        )}
      </header>

      <ScanWorkspace
        key={page.id}
        parish={parish}
        book={book}
        page={page}
        pages={pages}
        pageIndex={pageIndex}
        prevPage={prevPage}
        nextPage={nextPage}
        onGoTo={goToPageNumber}
        showRecords={canMakeRecords}
        menu={
          isAdmin ? (
            <AdminRowActions
              label="More for this page"
              actions={[{ label: "Remove this page", danger: true, onSelect: () => setRemoveOpen(true) }]}
            />
          ) : null
        }
      />

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

// Brightness, contrast and the turn carry over from page to page: a book is usually photographed the same way.
let lastAdjust: ScanAdjust = NO_ADJUST;

function ScanWorkspace({
  parish,
  book,
  page,
  pages,
  pageIndex,
  prevPage,
  nextPage,
  onGoTo,
  showRecords,
  menu,
}: {
  parish: Parish;
  book: LedgerBook;
  page: LedgerPage;
  pages: LedgerPage[];
  pageIndex: number;
  prevPage?: LedgerPage;
  nextPage?: LedgerPage;
  onGoTo: (n: number) => void;
  showRecords: boolean;
  menu: ReactNode;
}) {
  const { url, failed } = useLedgerPageImage(parish.id, page.id, "full");
  const [adjust, setAdjustState] = useState<ScanAdjust>(lastAdjust);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 1024);
  const [jump, setJump] = useState(String(page.pageNumber));
  const [jumpError, setJumpError] = useState("");

  function setAdjust(next: ScanAdjust) {
    lastAdjust = next;
    setAdjustState(next);
  }

  function handleJump(e: FormEvent) {
    e.preventDefault();
    const n = Number(jump);
    if (!Number.isInteger(n) || !pages.some((p) => p.pageNumber === n)) {
      setJumpError(`There's no page ${jump || "—"} in this book.`);
      return;
    }
    setJumpError("");
    if (n !== page.pageNumber) onGoTo(n);
  }

  const adjusted = adjust.brightness !== 1 || adjust.contrast !== 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-admin-border bg-admin-surface shadow-[var(--shadow-card)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-admin-border px-2.5 py-2">
        <ToolButton label="Previous page (←)" onClick={() => prevPage && onGoTo(prevPage.pageNumber)} disabled={!prevPage}>
          <Chevron dir="left" />
        </ToolButton>
        <form onSubmit={handleJump} className="flex items-center gap-1.5 text-admin-body text-admin-ink">
          <label htmlFor="ledger-page-box" className="text-admin-ink-muted">
            Page
          </label>
          <input
            id="ledger-page-box"
            inputMode="numeric"
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
            onBlur={() => {
              setJump(String(page.pageNumber));
              setJumpError("");
            }}
            className="h-8 w-12 rounded-md border border-admin-border bg-admin-surface text-center tabular-nums focus:border-admin-green-700 focus:outline-none focus:ring-2 focus:ring-admin-green-100"
            aria-describedby="ledger-page-count"
          />
          <span id="ledger-page-count" className="whitespace-nowrap text-admin-ink-muted">
            · {pageIndex + 1} of {pages.length} scanned
          </span>
        </form>
        <ToolButton label="Next page (→)" onClick={() => nextPage && onGoTo(nextPage.pageNumber)} disabled={!nextPage}>
          <Chevron dir="right" />
        </ToolButton>

        <Divider />

        <ToolButton label="Turn the photo" onClick={() => setAdjust({ ...adjust, turns: (adjust.turns + 1) % 4 })}>
          <RotateIcon />
        </ToolButton>
        <div className="relative">
          <ToolButton
            label="Brightness and contrast"
            onClick={() => setAdjustOpen((o) => !o)}
            pressed={adjustOpen || adjusted}
          >
            <SunIcon />
          </ToolButton>
          {adjustOpen && (
            <AdjustPopover adjust={adjust} onChange={setAdjust} onClose={() => setAdjustOpen(false)} />
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {showRecords && (
            <TextButton onClick={() => setPanelOpen((o) => !o)} pressed={panelOpen}>
              From this page{page.recordCount > 0 ? ` (${page.recordCount})` : ""}
            </TextButton>
          )}
          {menu}
        </div>
      </div>

      {jumpError && (
        <p className="border-b border-admin-border bg-admin-red-100 px-4 py-1.5 text-admin-support text-admin-red-700" role="alert">
          {jumpError}
        </p>
      )}

      {/* Scan and side panel */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ZoomableScan
            key={adjust.turns}
            url={url}
            failed={failed}
            alt={ledgerPageAlt(book, page)}
            width={page.width}
            height={page.height}
            adjust={adjust}
          />
        </div>
        {showRecords && panelOpen && <FromThisPage parish={parish} page={page} />}
      </div>

      {/* Neighbouring pages */}
      {pages.length > 1 && <PageStrip parish={parish} book={book} pages={pages} pageIndex={pageIndex} onGoTo={onGoTo} />}
    </div>
  );
}

/** The records made from this page, to check against the handwriting. */
function FromThisPage({ parish, page }: { parish: Parish; page: LedgerPage }) {
  const { data, loading } = useAsync(() => getLedgerPageReading(parish.id, page.id), [parish.id, page.id]);
  const records = data?.records ?? [];

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-l border-admin-border xl:w-[300px]" aria-label="Records from this page">
      <div className="border-b border-admin-border px-4 py-3">
        <h2 className="text-admin-body font-semibold text-admin-ink">From this page</h2>
        <p className="text-admin-support text-admin-ink-muted">
          {page.recordCount > 0
            ? `${page.recordCount} ${page.recordCount === 1 ? "record" : "records"} made`
            : page.readAt
              ? "Read, no records yet"
              : "Not read yet"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && records.length === 0 ? (
          <p className="px-4 py-3 text-admin-support text-admin-ink-muted">Loading…</p>
        ) : records.length === 0 ? (
          <p className="px-4 py-3 text-admin-support text-admin-ink-muted">
            Records you make from this page will be listed here, so you can check them against the scan.
          </p>
        ) : (
          <ul className="divide-y divide-admin-border">
            {records.map((r) => (
              <li key={r.recordId}>
                <Link
                  to={`/${parish.slug}/admin/records/baptismal/${encodeURIComponent(r.recordId)}`}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-admin-surface-alt"
                >
                  <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-admin-surface-alt px-1 text-admin-label font-semibold tabular-nums text-admin-ink-muted">
                    {r.row}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-admin-body font-medium text-admin-ink">{r.name || "Unnamed"}</span>
                    <span className="block text-admin-support text-admin-ink-muted">Baptized {formatTableDate(r.date)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** A few pages either side of this one, like the thumbnail strip in Mirador. */
function PageStrip({
  parish,
  book,
  pages,
  pageIndex,
  onGoTo,
}: {
  parish: Parish;
  book: LedgerBook;
  pages: LedgerPage[];
  pageIndex: number;
  onGoTo: (n: number) => void;
}) {
  const start = Math.max(0, pageIndex - STRIP_REACH);
  const near = pages.slice(start, pageIndex + STRIP_REACH + 1);
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pageIndex]);

  return (
    <nav className="flex gap-2 overflow-x-auto border-t border-admin-border px-3 py-2" aria-label="Nearby pages">
      {near.map((p) => {
        const current = p.id === pages[pageIndex].id;
        return (
          <button
            key={p.id}
            ref={current ? currentRef : undefined}
            type="button"
            onClick={() => onGoTo(p.pageNumber)}
            aria-current={current ? "page" : undefined}
            className={`relative shrink-0 overflow-hidden rounded-md border-2 ${
              current ? "border-admin-green-700" : "border-transparent opacity-80 hover:opacity-100"
            }`}
          >
            <LedgerPageImage
              parishId={parish.id}
              pageId={p.id}
              size="thumb"
              alt={ledgerPageAlt(book, p)}
              className="h-14 w-20 bg-admin-surface-alt object-cover object-top"
            />
            <span className="absolute bottom-0.5 left-0.5 rounded bg-white/90 px-1 text-[0.6875rem] font-semibold tabular-nums text-admin-ink">
              {p.pageNumber}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function AdjustPopover({
  adjust,
  onChange,
  onClose,
}: {
  adjust: ScanAdjust;
  onChange: (a: ScanAdjust) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.parentElement?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [onClose]);

  return (
    <div
      ref={box}
      className="absolute left-0 top-full z-30 mt-1.5 w-[240px] rounded-lg border border-admin-border bg-admin-surface p-3.5 shadow-[var(--shadow-card)]"
    >
      <Slider label="Brightness" value={adjust.brightness} onChange={(brightness) => onChange({ ...adjust, brightness })} />
      <Slider label="Contrast" value={adjust.contrast} onChange={(contrast) => onChange({ ...adjust, contrast })} />
      <button
        type="button"
        onClick={() => onChange({ ...adjust, brightness: 1, contrast: 1 })}
        className="mt-1 text-admin-support font-semibold text-admin-green-700 hover:underline"
      >
        Reset
      </button>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="mb-3 block text-admin-support text-admin-ink">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums text-admin-ink-muted">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--color-admin-green-700)]"
      />
    </label>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-admin-ink hover:bg-admin-surface-alt disabled:opacity-35 disabled:hover:bg-transparent ${
        pressed ? "bg-admin-green-100 text-admin-green-700" : ""
      }`}
    >
      {children}
    </button>
  );
}

function TextButton({
  onClick,
  title,
  pressed,
  children,
}: {
  onClick: () => void;
  title?: string;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={pressed}
      className={`h-8 whitespace-nowrap rounded-md px-2.5 text-admin-support font-medium hover:bg-admin-surface-alt ${
        pressed ? "bg-admin-green-100 text-admin-green-700" : "text-admin-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 hidden h-5 w-px bg-admin-border sm:block" aria-hidden="true" />;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      {children}
    </svg>
  );
}

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <Icon>
    <polyline points={dir === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
  </Icon>
);
const RotateIcon = () => (
  <Icon>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Icon>
);
const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);
