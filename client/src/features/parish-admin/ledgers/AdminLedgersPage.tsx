import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AdminField, AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  createLedgerBook,
  listLedgerBooks,
  searchLedgers,
} from "@/features/parish-admin/ledgers/api/ledgersApi";
import { CreateLedgerBookModal } from "@/features/parish-admin/ledgers/CreateLedgerBookModal";
import { LedgerBookCard, LedgerSearchHitCard, LedgerStateMessage, NewLedgerBookCard } from "@/features/parish-admin/ledgers/LedgerCards";
import { bookOverlapsYears } from "@/features/parish-admin/ledgers/ledgersHelpers";
import {
  LEDGER_SACRAMENT_LABELS,
  LEDGER_SACRAMENT_ORDER,
  LEDGER_SEARCH_FIELDS,
  type LedgerSearchField,
  type LedgerSearchHit,
} from "@/features/parish-admin/ledgers/types";
import { useAsync } from "@/hooks/useAsync";
import type { Parish, SacramentType } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

function parseYear(value: string) {
  const n = Number(value);
  return value && Number.isFinite(n) ? n : undefined;
}

export function AdminLedgersPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();
  const canUpload = user?.role === "parish_admin";

  const [activeTab, setActiveTab] = useState<SacramentType>(LEDGER_SACRAMENT_ORDER[0]);
  const [query, setQuery] = useState("");
  const [field, setField] = useState<LedgerSearchField>("all");
  const [bookFilter, setBookFilter] = useState("all");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [newBookOpen, setNewBookOpen] = useState(false);

  const { data: books = [], loading: booksLoading, refetch: refetchBooks } = useAsync(
    () => listLedgerBooks(parish.id),
    [parish.id]
  );

  const tabBooks = books.filter((b) => b.sacramentType === activeTab);
  const bookFilterOptions = tabBooks;

  const parsedYearFrom = parseYear(yearFrom);
  const parsedYearTo = parseYear(yearTo);

  const visibleBooks = tabBooks
    .filter((b) => (bookFilter === "all" ? true : b.id === bookFilter))
    .filter((b) => bookOverlapsYears(b, parsedYearFrom, parsedYearTo))
    .sort((a, b) => b.yearStart - a.yearStart || a.volumeLabel.localeCompare(b.volumeLabel));

  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length > 0;
  const { data: searchResult, loading: searchLoading } = useAsync(
    async () => {
      if (!trimmedQuery) return { query: "", hits: [] as LedgerSearchHit[] };
      const hits = await searchLedgers(parish.id, trimmedQuery, {
        field,
        bookId: bookFilter,
        sacrament: activeTab,
      });
      return { query: trimmedQuery, hits };
    },
    [parish.id, trimmedQuery, field, bookFilter, activeTab]
  );
  const hits = searchResult?.hits ?? [];
  const searchSettled = searchResult?.query === trimmedQuery;
  const filteredHits = hits.filter((hit) => bookOverlapsYears(hit, parsedYearFrom, parsedYearTo));

  const filtersActive = Boolean(
    trimmedQuery || field !== "all" || bookFilter !== "all" || parsedYearFrom != null || parsedYearTo != null
  );

  function selectTab(tab: SacramentType) {
    setActiveTab(tab);
    setBookFilter("all");
  }

  function clearFilters() {
    setQuery("");
    setField("all");
    setBookFilter("all");
    setYearFrom("");
    setYearTo("");
  }

  return (
    <div className="admin-dash mx-auto w-full max-w-[1920px]">
      <header className="mb-6">
        <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
          Digitized Ledger
        </h1>
        <p className="admin-dash__muted mt-1.5 text-admin-body">
          Browse register books or search across all pages. Pages are viewed as scanned — no data is
          auto-extracted into records.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-6 border-b border-[var(--dash-border)]">
        {LEDGER_SACRAMENT_ORDER.map((type) => {
          const isActive = type === activeTab;
          return (
            <button
              key={type}
              type="button"
              onClick={() => selectTab(type)}
              className={`relative pb-3 text-[0.875rem] font-semibold transition-colors ${
                isActive
                  ? "text-[var(--dash-ink)]"
                  : "text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)]"
              }`}
            >
              {LEDGER_SACRAMENT_LABELS[type]} Register
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--dash-green)]" />
              )}
            </button>
          );
        })}
      </div>

      <section className="admin-dash__card mb-5 overflow-hidden bg-white">
        <div className="border-b border-[var(--dash-border)] bg-white px-5 py-2.5 sm:px-6">
          <h2 className="text-[0.78rem] font-semibold text-[var(--dash-ink)]">Search & filters</h2>
        </div>
        <div className="space-y-4 bg-white p-5 sm:p-6 sm:px-6">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-ink-faint)]" />
            <AdminInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${LEDGER_SACRAMENT_LABELS[activeTab]} Register — name, date, priest, sponsor…`}
              aria-label="Search digitized ledgers"
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminField label="Book" className="mb-0">
              <AdminSelect value={bookFilter} onChange={(e) => setBookFilter(e.target.value)}>
                <option value="all">All Books</option>
                {bookFilterOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.volumeLabel}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Field" className="mb-0">
              <AdminSelect value={field} onChange={(e) => setField(e.target.value as LedgerSearchField)}>
                {LEDGER_SEARCH_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Year from" className="mb-0">
              <AdminInput
                type="number"
                min={1500}
                max={2100}
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="e.g. 1970"
              />
            </AdminField>
            <AdminField label="Year to" className="mb-0">
              <AdminInput
                type="number"
                min={1500}
                max={2100}
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="e.g. 1988"
              />
            </AdminField>
          </div>
          {filtersActive && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="text-admin-support font-semibold text-[var(--dash-green)] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {searching ? (
        searchLoading || !searchSettled ? (
          <LedgerStateMessage>Searching the digitized registers…</LedgerStateMessage>
        ) : filteredHits.length === 0 ? (
          <LedgerStateMessage>
            No matches for “{trimmedQuery}” in the scanned pages. Try a different spelling, field, or clear the
            filters.
          </LedgerStateMessage>
        ) : (
          <div>
            <p className="admin-dash__muted mb-4 text-admin-body">
              {filteredHits.length} {filteredHits.length === 1 ? "match" : "matches"} in the digitized registers
            </p>
            <ul className="flex flex-col gap-4">
              {filteredHits.map((hit) => (
                <li key={hit.pageId}>
                  <LedgerSearchHitCard hit={hit} />
                </li>
              ))}
            </ul>
          </div>
        )
      ) : booksLoading && books.length === 0 ? (
        <LedgerStateMessage>Loading register books…</LedgerStateMessage>
      ) : tabBooks.length === 0 ? (
        <LedgerStateMessage>
          No {LEDGER_SACRAMENT_LABELS[activeTab].toLowerCase()} registers digitized yet.
          {canUpload ? " Use New Book to start one." : ""}
        </LedgerStateMessage>
      ) : visibleBooks.length === 0 ? (
        <LedgerStateMessage>No register books match these filters.</LedgerStateMessage>
      ) : (
        <div>
          <p className="mb-4 text-[0.75rem] font-medium tracking-[0.01em] text-[var(--dash-ink-soft)]">
            {LEDGER_SACRAMENT_LABELS[activeTab]} Register Books
          </p>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
            {visibleBooks.map((book, i) => (
              <LedgerBookCard key={book.id} book={book} coverIndex={i} />
            ))}
            {canUpload && <NewLedgerBookCard onClick={() => setNewBookOpen(true)} />}
          </div>
        </div>
      )}

      {newBookOpen && canUpload && (
        <CreateLedgerBookModal
          sacramentType={activeTab}
          onClose={() => setNewBookOpen(false)}
          onSubmit={async (input) => {
            await createLedgerBook(parish.id, input);
            refetchBooks();
          }}
        />
      )}
    </div>
  );
}

function SearchIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}
