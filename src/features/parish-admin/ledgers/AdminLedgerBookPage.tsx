import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailBackLink } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { getLedgerBook, listLedgerPages, uploadLedgerPages } from "@/features/parish-admin/ledgers/api/ledgersApi";
import { LedgerStateMessage } from "@/features/parish-admin/ledgers/LedgerCards";
import { ledgerPageAlt, ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { ledgerSacramentBadgeTone } from "@/features/parish-admin/ledgers/ledgerVisuals";
import { UploadLedgerPageModal } from "@/features/parish-admin/ledgers/UploadLedgerPageModal";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

export function AdminLedgerBookPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { bookId = "" } = useParams();
  const user = useCurrentUser();
  const canUpload = user?.role === "parish_admin";
  const [uploadOpen, setUploadOpen] = useState(false);

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
      <div className="admin-dash mx-auto max-w-[1180px]">
        <RecordDetailBackLink />
        <p className="admin-dash__muted text-admin-body">Loading register book…</p>
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

  const pagesLabel = book.pageCount === 1 ? "1 page" : `${book.pageCount} pages`;
  const loadingPages = pagesLoading && pages.length === 0;

  return (
    <div className="admin-dash mx-auto max-w-[1180px]">
      <RecordDetailBackLink />

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <AdminBadge tone={ledgerSacramentBadgeTone(book.sacramentType)}>
              {ledgerSacramentLabel(book.sacramentType)}
            </AdminBadge>
            {book.status === "scanning" && <AdminBadge tone="amber">Scanning</AdminBadge>}
          </div>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            {book.title}
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">
            {book.volumeLabel} · {ledgerYearRange(book)} · {pagesLabel}
          </p>
        </div>
        {canUpload && (
          <AdminButton onClick={() => setUploadOpen(true)} className="!rounded-[10px]">
            Upload pages
          </AdminButton>
        )}
      </header>

      {loadingPages ? (
        <LedgerStateMessage>Loading scanned pages…</LedgerStateMessage>
      ) : pages.length === 0 ? (
        <LedgerStateMessage>
          This register has no scanned pages yet.
          {canUpload ? " Upload photos of the book to start." : " Ask a parish admin to upload scans."}
        </LedgerStateMessage>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
          {pages.map((page) => (
            <Link
              key={page.id}
              to={`pages/${page.pageNumber}`}
              className="group block rounded-[var(--dash-radius,14px)] outline-none focus-visible:ring-2 focus-visible:ring-admin-green-700/40"
            >
              <AdminCard className="overflow-hidden p-0 transition-colors group-hover:border-admin-green-700/35">
                <img
                  src={page.imageUrl}
                  alt={ledgerPageAlt(book, page)}
                  className="aspect-[3/4] w-full bg-admin-surface-alt object-cover object-top"
                />
                <div className="border-t border-admin-border px-4 py-3">
                  <p className="text-admin-body font-semibold text-admin-ink">Page {page.pageNumber}</p>
                  <p className="mt-0.5 text-admin-support text-admin-ink-muted">Open scan</p>
                </div>
              </AdminCard>
            </Link>
          ))}
        </div>
      )}

      {uploadOpen && canUpload && (
        <UploadLedgerPageModal
          parishId={parish.id}
          books={[book]}
          defaultBookId={book.id}
          onClose={() => setUploadOpen(false)}
          onSubmit={async (pages) => {
            await uploadLedgerPages(parish.id, pages);
            refetchPages();
            refetchBook();
          }}
        />
      )}
    </div>
  );
}
