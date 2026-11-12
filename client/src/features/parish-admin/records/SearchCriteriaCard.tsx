import type { ReactNode } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import "@/features/parish-admin/styles/adminDesk.css";

/**
 * The search fields above a register, with Search and Clear search. Enter in any field searches.
 * Clear search empties every field and shows the whole register again.
 */
export function SearchCriteriaCard({
  children,
  onSearch,
  onClear,
  canClear,
}: {
  children: ReactNode;
  onSearch: () => void;
  onClear: () => void;
  /** Something is typed in, or a search is showing. */
  canClear: boolean;
}) {
  return (
    <section className="admin-dash mb-[18px]">
      <div className="admin-dash__card overflow-hidden bg-white">
        <div className="border-b border-[var(--dash-border)] bg-white px-5 py-2.5">
          <h2 className="text-[0.78rem] font-semibold text-[var(--dash-ink)]">Search criteria</h2>
        </div>
        <form
          role="search"
          className="bg-white p-5 px-[22px]"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          {children}
          <div className="mt-3.5 flex flex-wrap justify-end gap-2">
            <AdminButton type="button" variant="secondary" onClick={onClear} disabled={!canClear} className="!rounded-full">
              <ClearIcon />
              Clear search
            </AdminButton>
            <AdminButton type="submit" className="!rounded-full">
              <SearchIcon />
              Search
            </AdminButton>
          </div>
        </form>
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
    </svg>
  );
}
