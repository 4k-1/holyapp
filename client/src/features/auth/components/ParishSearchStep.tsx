import { useEffect, useState } from "react";
import { searchParishes } from "@/features/parish/parishApi";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

interface ParishSearchStepProps {
  onSelect: (parish: Parish) => void;
}

export function ParishSearchStep({ onSelect }: ParishSearchStepProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void searchParishes(query)
      .then((parishes) => {
        if (!cancelled) setResults(parishes);
      })
      .catch((err) => {
        if (!cancelled) {
          setResults([]);
          setError(err instanceof Error ? err.message : "Could not load parishes.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="auth-desk flex w-full flex-col gap-5">
      <div>
        <h1 className="auth-desk__title">Find your parish</h1>
        <p className="auth-desk__subtitle">Search by name or location to continue.</p>
      </div>

      <div>
        <label htmlFor="parish-search" className="auth-desk__label">
          Parish
        </label>
        <input
          id="parish-search"
          className="auth-desk__input"
          placeholder="Search parishes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex max-h-[min(22rem,50vh)] flex-col gap-2 overflow-y-auto">
        {loading && (
          <p className="text-[0.84375rem] text-[var(--auth-ink-soft)]">Loading parishes…</p>
        )}
        {error && (
          <p role="alert" className="auth-desk__error">
            {error}
          </p>
        )}
        {!loading &&
          !error &&
          results.map((parish) => (
            <button
              key={parish.id}
              type="button"
              className="auth-desk__result"
              onClick={() => onSelect(parish)}
            >
              <p className="text-[0.875rem] font-semibold text-[var(--auth-ink)]">{parish.name}</p>
              <p className="mt-0.5 text-[0.78rem] text-[var(--auth-ink-soft)]">{parish.address}</p>
            </button>
          ))}
        {!loading && !error && results.length === 0 && (
          <p className="text-[0.84375rem] text-[var(--auth-ink-soft)]">No parishes match your search.</p>
        )}
      </div>
    </div>
  );
}
