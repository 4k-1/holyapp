import { useEffect, useState } from "react";
import { AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { getBaptismalRecord, listBaptismalRecords } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import {
  baptismRecordRef,
  emptySearchCriteria,
  filterBaptismalRecords,
  formatRecordDate,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { BaptismalRecord } from "@/features/parish-admin/records/types";

type LinkMode = "search" | "manual";

interface BaptismalRecordLinkFieldProps {
  parishId: string;
  value: string;
  onChange: (recordId: string, record: BaptismalRecord | null) => void;
  /** Prefills the search box (e.g. the person currently being encoded). */
  initialQuery?: string;
  label?: string;
  className?: string;
}

export function BaptismalRecordLinkField({
  parishId,
  value,
  onChange,
  initialQuery = "",
  label = "Baptismal record",
  className = "",
}: BaptismalRecordLinkFieldProps) {
  const [mode, setMode] = useState<LinkMode>(value ? "manual" : "search");
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<BaptismalRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [linked, setLinked] = useState<BaptismalRecord | null>(null);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!value) setLinked(null);
  }

  useEffect(() => {
    if (!value) return;
    if (linked?.id === value) return;
    let cancelled = false;
    getBaptismalRecord(parishId, value).then((rec) => {
      if (!cancelled) setLinked(rec ?? null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parishId, value]);

  // Clear results or show "Searching…" as soon as the query changes; the effect only runs the debounced search.
  const searchKey = mode === "search" ? query.trim() : null;
  const [prevSearchKey, setPrevSearchKey] = useState<string | null>(null);
  if (searchKey !== prevSearchKey) {
    setPrevSearchKey(searchKey);
    if (searchKey !== null) {
      if (searchKey.length < 2) {
        setHits([]);
        setSearching(false);
      } else {
        setSearching(true);
      }
    }
  }

  useEffect(() => {
    if (mode !== "search") return;
    const q = query.trim();
    if (q.length < 2) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const all = await listBaptismalRecords(parishId);
        const filtered = filterBaptismalRecords(all, { ...emptySearchCriteria(), name: q }).slice(0, 8);
        if (!cancelled) setHits(filtered);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, query, parishId]);

  function selectRecord(rec: BaptismalRecord) {
    setLinked(rec);
    onChange(rec.id, rec);
  }

  function clearLink() {
    setLinked(null);
    onChange("", null);
  }

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.8125rem] font-semibold text-admin-ink">{label}</p>
        <div className="inline-flex rounded-[10px] border border-admin-border bg-admin-surface-alt p-1">
          {(
            [
              ["search", "Search"],
              ["manual", "Enter ID"],
            ] as const
          ).map(([next, text]) => (
            <button
              key={next}
              type="button"
              onClick={() => setMode(next)}
              className={`rounded-[7px] px-2.5 py-1 text-admin-label font-semibold transition ${
                mode === next ? "bg-admin-surface text-admin-ink shadow-sm" : "text-admin-ink-muted"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {mode === "search" ? (
        <div className="space-y-2">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="pointer-events-none absolute left-[11px] top-1/2 z-10 h-[15px] w-[15px] -translate-y-1/2 text-admin-ink-faint"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <AdminInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by baptismal name…"
              className="pl-[34px]"
              aria-label="Search baptismal records"
            />
          </div>

          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="text-admin-support text-admin-ink-muted">Type at least 2 characters to search.</p>
          )}
          {searching && <p className="text-admin-support text-admin-ink-muted">Searching…</p>}
          {!searching && query.trim().length >= 2 && hits.length === 0 && (
            <p className="text-admin-support text-admin-ink-muted">
              No matching baptismal records. Try another name, or enter the ID manually.
            </p>
          )}

          {hits.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-[9px] border border-admin-border bg-admin-surface p-1.5">
              {hits.map((rec) => {
                const selected = value === rec.id;
                return (
                  <li key={rec.id}>
                    <button
                      type="button"
                      onClick={() => selectRecord(rec)}
                      className={`w-full rounded-[7px] px-3 py-2 text-left transition ${
                        selected
                          ? "bg-admin-green-050 ring-1 ring-admin-green-700/40"
                          : "hover:bg-admin-surface-alt"
                      }`}
                    >
                      <span className="block text-admin-body font-semibold text-admin-ink">{recordFullName(rec)}</span>
                      <span className="mt-0.5 block text-admin-support text-admin-ink-muted">
                        {baptismRecordRef(rec)} · Baptized {formatRecordDate(rec.dateOfBaptism)} · Parents{" "}
                        {recordFatherName(rec)} / {recordMotherName(rec)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <AdminField label="Baptismal record ID" className="mb-0">
          <AdminInput
            placeholder="e.g. bap-001"
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              onChange(next, null);
              setLinked(null);
            }}
          />
        </AdminField>
      )}

      {(value || linked) && (
        <div className="mt-2.5 rounded-[9px] border border-admin-green-700/25 bg-admin-green-050 px-3 py-2.5">
          <p className="text-admin-support font-semibold text-admin-green-800">
            {linked
              ? `Linked: ${recordFullName(linked)} · ${baptismRecordRef(linked)}`
              : `Linked ID: ${value}`}
          </p>
          {linked && (
            <p className="mt-0.5 text-admin-support text-admin-ink-muted">
              Baptized {formatRecordDate(linked.dateOfBaptism)}
              {linked.placeOfBaptism ? ` · ${linked.placeOfBaptism}` : ""}
            </p>
          )}
          <button
            type="button"
            onClick={clearLink}
            className="mt-1 text-admin-support font-semibold text-admin-green-700 hover:underline"
          >
            Clear link
          </button>
        </div>
      )}
    </div>
  );
}
