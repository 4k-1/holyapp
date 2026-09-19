import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { BookIcon } from "@/features/parish-admin/components/AdminForm";
import { ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import {
  LedgerSacramentIcon,
  ledgerBookCoverClass,
  ledgerSacramentBadgeTone,
} from "@/features/parish-admin/ledgers/ledgerVisuals";
import type { LedgerBook, LedgerSearchHit } from "@/features/parish-admin/ledgers/types";

export function LedgerBookCard({ book, coverIndex }: { book: LedgerBook; coverIndex: number }) {
  const pagesLabel = book.pageCount === 1 ? "1 page" : `${book.pageCount} pages`;

  return (
    <Link
      to={book.id}
      className="group block h-full rounded-[var(--dash-radius,14px)] outline-none focus-visible:ring-2 focus-visible:ring-admin-green-700/40"
    >
      <AdminCard className="flex h-full flex-col overflow-hidden p-0 transition-colors group-hover:border-admin-green-700/35">
        <div className={`relative flex h-32 items-start justify-between p-4 ${ledgerBookCoverClass(coverIndex)}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/20 text-white">
            <BookIcon className="h-4 w-4" />
          </span>
          {book.status === "scanning" && <AdminBadge tone="amber">Scanning</AdminBadge>}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="mb-1 font-serif text-admin-group font-semibold leading-snug text-admin-ink">
            {book.volumeLabel}
          </h3>
          <p className="text-admin-support text-admin-ink-muted">{ledgerYearRange(book)}</p>
          <p className="mt-auto pt-3 text-admin-support text-admin-ink-faint">{pagesLabel} digitized</p>
        </div>
      </AdminCard>
    </Link>
  );
}

export function NewLedgerBookCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2.5 rounded-[var(--dash-radius,14px)] border-2 border-dashed border-admin-border-strong bg-white p-5 text-center transition-colors hover:border-admin-green-700 hover:bg-admin-green-050/50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-admin-green-050 text-admin-green-700">
        <PlusIcon className="h-4 w-4" />
      </span>
      <span className="font-serif text-admin-body font-semibold text-admin-ink">New Book</span>
      <span className="text-admin-support text-admin-ink-muted">Start a new register book</span>
    </button>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  );
}

export function LedgerSearchHitCard({ hit }: { hit: LedgerSearchHit }) {
  return (
    <Link
      to={`${hit.bookId}/pages/${hit.pageNumber}`}
      className="block rounded-[var(--dash-radius,14px)] outline-none focus-visible:ring-2 focus-visible:ring-admin-green-700/40"
    >
      <AdminCard className="p-5 px-6 transition-colors hover:border-admin-green-700/35 hover:bg-admin-green-050/40">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-green-050 text-admin-green-700">
            <LedgerSacramentIcon type={hit.sacramentType} className="h-3.5 w-3.5" />
          </span>
          <AdminBadge tone={ledgerSacramentBadgeTone(hit.sacramentType)}>
            {ledgerSacramentLabel(hit.sacramentType)}
          </AdminBadge>
          <span className="text-admin-support text-admin-ink-muted">
            {hit.yearStart === hit.yearEnd ? hit.yearStart : `${hit.yearStart}–${hit.yearEnd}`}
          </span>
        </div>
        <p className="mb-1 text-admin-body font-semibold text-admin-ink">
          Match found on {hit.bookTitle}, page {hit.pageNumber}
        </p>
        {hit.snippet && (
          <p className="mb-2.5 text-admin-support leading-relaxed text-admin-ink-muted">{hit.snippet}</p>
        )}
        <span className="text-admin-support font-semibold text-admin-green-700">Open page →</span>
      </AdminCard>
    </Link>
  );
}

export function LedgerStateMessage({ children }: { children: ReactNode }) {
  return (
    <AdminCard className="px-6 py-10 text-center">
      <p className="text-admin-body text-admin-ink-muted">{children}</p>
    </AdminCard>
  );
}
