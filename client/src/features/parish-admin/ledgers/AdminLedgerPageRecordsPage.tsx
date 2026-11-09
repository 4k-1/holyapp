// Make records from a scanned register page: read the page (Gemini), then check each row
// against the handwriting and save it as a baptismal record. The reading is kept with the
// page, so coming back later picks up where you left off without reading it again.
import { useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailBackLink } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { listLedgerPages } from "@/features/parish-admin/ledgers/api/ledgersApi";
import {
  getLedgerPageReading,
  readLedgerPage,
  type LedgerPageReading,
} from "@/features/parish-admin/ledgers/api/ledgerScanApi";
import { LedgerPageImage } from "@/features/parish-admin/ledgers/LedgerPageImage";
import { useLedgerPageImage } from "@/features/parish-admin/ledgers/useLedgerPageImage";
import { LedgerRowChecker } from "@/features/parish-admin/ledgers/LedgerRowChecker";
import { ledgerPageAlt } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

/** The book number records cite: the digits of the book's label ("Book 6" → "6"), else the label. */
function bookNumberOf(volumeLabel: string) {
  return volumeLabel.match(/\d+/)?.[0] ?? volumeLabel;
}

function readOn(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function AdminLedgerPageRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { bookId = "", pageNumber: pageNumberParam = "" } = useParams();
  const pageNumber = Number(pageNumberParam);

  const { data: pages, loading: pagesLoading } = useAsync(
    () => listLedgerPages(parish.id, bookId),
    [parish.id, bookId]
  );
  const pageId = pages?.find((p) => p.pageNumber === pageNumber)?.id;

  const { data: loaded, loading: readingLoading } = useAsync(
    () => (pageId ? getLedgerPageReading(parish.id, pageId) : Promise.resolve(null)),
    [parish.id, pageId]
  );
  // A fresh reading replaces the loaded one.
  const [fresh, setFresh] = useState<LedgerPageReading | null>(null);
  const data = fresh && fresh.page.id === pageId ? fresh : loaded;

  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const photo = useLedgerPageImage(parish.id, data?.reading ? pageId : undefined, "full");

  const savedRows = useMemo(
    () => Object.fromEntries((data?.records ?? []).map((r) => [r.row, r.recordId])) as Record<number, string>,
    [data]
  );

  async function read() {
    if (!pageId || reading) return;
    setReading(true);
    setError("");
    try {
      setFresh(await readLedgerPage(parish.id, pageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The page couldn't be read.");
    } finally {
      setReading(false);
    }
  }

  if (pagesLoading || (pageId && readingLoading && !data)) {
    return (
      <div className="admin-dash mx-auto w-full max-w-[1920px]">
        <RecordDetailBackLink />
        <p className="admin-dash__muted text-admin-body">Loading page…</p>
      </div>
    );
  }

  if (!pageId || !data) {
    return (
      <div className="admin-dash mx-auto w-full max-w-[1920px]">
        <RecordDetailBackLink />
        <h1 className="mb-1 font-serif text-[1.35rem] font-bold text-[var(--dash-ink)] sm:text-[1.5rem]">
          Page not found
        </h1>
        <p className="admin-dash__muted text-admin-body">Page {pageNumberParam || "—"} is not in this book.</p>
      </div>
    );
  }

  const { book, page, reading: result } = data;
  const notBaptism = book.sacramentType !== "baptism";
  const toCheck = result
    ? result.entries.filter((e) => e.uncertainFields.length > 0 || e.checks.length > 0).length
    : 0;
  const layoutWarning =
    result && result.split && !result.split.confirmed
      ? result.split.note
      : result && result.cells.length === 0
        ? "The rows couldn't be lined up with the photo, so there are no handwriting strips. Check each row against the page photo instead."
        : null;

  return (
    <div className="admin-dash mx-auto w-full max-w-[1920px]">
      <RecordDetailBackLink />

      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 text-[0.75rem] font-medium tracking-[0.01em] text-[var(--dash-ink-soft)]">
            <Link to="../.." relative="path" className="hover:underline">
              {book.title}
            </Link>{" "}
            · page {page.pageNumber}
          </p>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            Make records from page {page.pageNumber}
          </h1>
          {result ? (
            <p className="admin-dash__muted mt-1.5 text-admin-body">
              {result.entries.length} {result.entries.length === 1 ? "row" : "rows"} read
              {result.entries.length > 0 && ` · ${toCheck} ${toCheck === 1 ? "needs" : "need"} a closer look`}
              {page.readAt && ` · read ${readOn(page.readAt)}`}
            </p>
          ) : (
            <p className="admin-dash__muted mt-1.5 max-w-[70ch] text-admin-body">
              Read the page first. Each row becomes a draft to check against the handwriting and save as a
              baptismal record.
            </p>
          )}
        </div>
        {result && data.readerAvailable && (
          <AdminButton variant="secondary" size="sm" onClick={read} disabled={reading}>
            {reading ? "Reading…" : "Read again"}
          </AdminButton>
        )}
      </header>

      {error && (
        <p className="mb-4 rounded-[12px] border border-[#E3C3BC] bg-admin-red-100 px-4 py-2.5 text-admin-support text-admin-red-700" role="alert">
          {error}
        </p>
      )}

      {!result ? (
        <div className="admin-dash__card grid grid-cols-1 gap-6 bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <LedgerPageImage
            parishId={parish.id}
            pageId={page.id}
            alt={ledgerPageAlt(book, page)}
            className="max-h-[26rem] min-h-[12rem] w-full rounded-[10px] bg-[#f4efe6] object-contain"
          />
          <div className="flex flex-col justify-center gap-3">
            {notBaptism ? (
              <p className="text-admin-body text-[var(--dash-ink-soft)]">
                Only baptism registers can be read so far.
              </p>
            ) : !data.readerAvailable ? (
              <p className="text-admin-body text-[var(--dash-amber)]">
                Reading register pages isn&apos;t set up yet. Ask your system administrator to turn it on.
              </p>
            ) : (
              <>
                <AdminButton onClick={read} disabled={reading}>
                  {reading ? "Reading the page…" : "Read this page"}
                </AdminButton>
                <p className="admin-dash__muted text-admin-support" role={reading ? "status" : undefined}>
                  {reading
                    ? "This can take a minute or two. Keep this page open."
                    : "Both pages of the open book are read together. The photo is sent to Google Gemini to be read."}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {layoutWarning && (
            <p className="mb-4 rounded-[12px] border border-[#e8b45a] bg-[var(--dash-amber-soft)] px-4 py-2.5 text-admin-support text-[var(--dash-amber)]">
              {layoutWarning}
            </p>
          )}
          {result.entries.length === 0 ? (
            <div className="admin-dash__card bg-white p-6 text-admin-body text-[var(--dash-ink-soft)]">
              No filled rows were found on this page. If that&apos;s wrong, check that the photo shows both pages
              of the open book, then read it again.
            </div>
          ) : (
            <LedgerRowChecker
              // A new reading starts the check screen afresh.
              key={page.readAt ?? "unread"}
              result={result}
              imageUrl={result.cells.length === 0 ? null : photo.url || null}
              imageBlob={photo.blob}
              source={{
                pageId: page.id,
                bookNumber: bookNumberOf(book.volumeLabel),
                pageNumber: String(page.pageNumber),
                savedRows,
              }}
              parish={parish}
            />
          )}
        </>
      )}
    </div>
  );
}
