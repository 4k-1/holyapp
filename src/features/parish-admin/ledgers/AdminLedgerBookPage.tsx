import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { RecordDetailBackLink } from "@/features/parish-admin/components/AdminRecordDetailSection";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { getLedgerBook, listLedgerPages, uploadLedgerPage } from "@/features/parish-admin/ledgers/api/ledgersApi";
import { LedgerStateMessage } from "@/features/parish-admin/ledgers/LedgerCards";
import { ledgerPageAlt, ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { ledgerSacramentBadgeTone } from "@/features/parish-admin/ledgers/ledgerVisuals";
import { UploadLedgerPageModal } from "@/features/parish-admin/ledgers/UploadLedgerPageModal";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";

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
      <div>
        <RecordDetailBackLink />
        <p className="text-admin-body text-admin-ink-muted">Loading register book…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div>
        <RecordDetailBackLink />
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Book not found</h1>
        <p className="text-admin-body text-admin-ink-muted">
          This register is not available for this parish.
        </p>
      </div>
    );
  }

  const pagesLabel = book.pageCount === 1 ? "1 page" : `${book.pageCount} pages`;
  const loadingPages = pagesLoading && pages.length === 0;

  return (
    <div>
      <RecordDetailBackLink />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <AdminBadge tone={ledgerSacramentBadgeTone(book.sacramentType)}>
              {ledgerSacramentLabel(book.sacramentType)}
            </AdminBadge>
            {book.status === "scanning" && <AdminBadge tone="amber">Scanning</AdminBadge>}
          </div>
          <h1 className="mb-1 font-serif text-admin-page font-semibold leading-tight text-admin-ink">
            {book.title}
          </h1>
          <p className="text-admin-body text-admin-ink-muted">
            {book.volumeLabel} · {ledgerYearRange(book)} · {pagesLabel}
          </p>
        </div>
        {canUpload && (
          <AdminButton onClick={() => setUploadOpen(true)}>
            Upload / scan page
          </AdminButton>
        )}
      </div>

      {loadingPages ? (
        <LedgerStateMessage>Loading scanned pages…</LedgerStateMessage>
      ) : pages.length === 0 ? (
        <LedgerStateMessage>
          This register has no scanned pages yet.
          {canUpload ? " Attach a scan to start the book." : " Ask a parish admin to upload scans."}
        </LedgerStateMessage>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {pages.map((page) => (
            <Link
              key={page.id}
              to={`pages/${page.pageNumber}`}
              className="group block rounded-[var(--radius)] outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
            >
              <AdminCard className="overflow-hidden p-0 transition-colors group-hover:border-admin-green-600/40">
                <img
                  src={page.imageUrl}
                  alt={ledgerPageAlt(book, page)}
                  className="aspect-[3/4] w-full bg-admin-surface-alt object-cover object-top"
                />
                <div className="border-t border-admin-border px-3 py-2">
                  <p className="text-admin-body font-semibold text-admin-ink">Page {page.pageNumber}</p>
                  <p className="text-admin-label text-admin-ink-muted">Open scan</p>
                </div>
              </AdminCard>
            </Link>
          ))}
        </div>
      )}

      {uploadOpen && canUpload && (
        <UploadLedgerPageModal
          books={[book]}
          defaultBookId={book.id}
          onClose={() => setUploadOpen(false)}
          onSubmit={async (input) => {
            await uploadLedgerPage(parish.id, input);
            refetchPages();
            refetchBook();
          }}
        />
      )}
    </div>
  );
}
