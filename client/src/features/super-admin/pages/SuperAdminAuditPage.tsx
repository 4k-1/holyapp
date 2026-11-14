import { useState, type ReactNode } from "react";
import { useAsync } from "@/hooks/useAsync";
import {
  listPlatformAuditLog,
  listPlatformParishes,
  type AuditKind,
} from "@/features/super-admin/api/superAdminApi";
import { auditCopy, auditTone, formatAuditWhen } from "@/lib/auditCopy";
import { ChevronDownIcon } from "@/components/ui/icons/AdminIcons";
import type { AuditLogEntry } from "@/types";

type Activity = "all" | AuditKind;

const ACTIVITY: { id: Activity; label: string }[] = [
  { id: "all", label: "All activity" },
  { id: "green", label: "Everyday activity" },
  { id: "yellow", label: "Removals and suspensions" },
  { id: "red", label: "Failed sign-ins" },
];

export function SuperAdminAuditPage() {
  const { data: parishes = [] } = useAsync(() => listPlatformParishes(), []);
  const [parishFilter, setParishFilter] = useState("all");
  const [activity, setActivity] = useState<Activity>("all");
  const [open, setOpen] = useState<"parish" | "activity" | null>(null);

  // The filters go to the server, so they search the whole log; each new filter starts again from the newest entry.
  const filters = {
    parishId: parishFilter === "all" ? undefined : parishFilter,
    kind: activity === "all" ? undefined : activity,
  };
  const { data: firstPage, loading, error } = useAsync(
    () => listPlatformAuditLog(filters),
    [parishFilter, activity]
  );

  const [older, setOlder] = useState<AuditLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState("");

  // A new first page (a new filter) drops the older entries loaded for the last one.
  const [shownPage, setShownPage] = useState(firstPage);
  if (shownPage !== firstPage) {
    setShownPage(firstPage);
    setOlder([]);
    setOlderError("");
    setHasMore(firstPage?.hasMore ?? false);
  }

  const entries = [...(firstPage?.entries ?? []), ...older];

  async function showOlder() {
    const last = entries.at(-1);
    if (!last) return;
    setLoadingOlder(true);
    setOlderError("");
    try {
      const next = await listPlatformAuditLog({ ...filters, beforeId: last.id });
      setOlder((list) => [...list, ...next.entries]);
      setHasMore(next.hasMore);
    } catch {
      setOlderError("Couldn't load older entries. Try again.");
    } finally {
      setLoadingOlder(false);
    }
  }

  const parishLabel =
    parishFilter === "all"
      ? "All parishes"
      : (parishes.find((p) => p.parish.id === parishFilter)?.parish.name ?? "All parishes");
  const activityLabel = ACTIVITY.find((a) => a.id === activity)?.label ?? "All activity";

  return (
    <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-[18px] py-4">
        <div>
          <h2 className="font-sans text-[16px] font-bold text-admin-ink">System Audit Log</h2>
          <p className="mt-0.5 text-[13px] text-admin-ink-faint">
            Activity across every parish. Every super admin action is recorded here.
          </p>
        </div>
        <div className="flex gap-2.5">
          <FilterChip
            open={open === "parish"}
            label={parishLabel}
            onToggle={() => setOpen((v) => (v === "parish" ? null : "parish"))}
          >
            <button type="button" className={menuRow} onClick={() => { setParishFilter("all"); setOpen(null); }}>
              All parishes
            </button>
            {parishes.map((row) => (
              <button
                key={row.parish.id}
                type="button"
                className={menuRow}
                onClick={() => {
                  setParishFilter(row.parish.id);
                  setOpen(null);
                }}
              >
                {row.parish.name}
              </button>
            ))}
          </FilterChip>
          <FilterChip
            open={open === "activity"}
            label={activityLabel}
            onToggle={() => setOpen((v) => (v === "activity" ? null : "activity"))}
          >
            {ACTIVITY.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={menuRow}
                onClick={() => {
                  setActivity(opt.id);
                  setOpen(null);
                }}
              >
                {opt.label}
              </button>
            ))}
          </FilterChip>
        </div>
      </div>

      {error ? (
        <p className="px-[18px] py-8 text-center text-[13.5px] text-admin-red-700">
          Couldn't load the audit log. Refresh the page to try again.
        </p>
      ) : loading ? (
        <p className="px-[18px] py-8 text-center text-[13.5px] text-admin-ink-faint">Loading audit log…</p>
      ) : entries.length === 0 ? (
        <p className="px-[18px] py-8 text-center text-[13.5px] text-admin-ink-faint">No matching entries.</p>
      ) : (
        <>
          <ul>
            {entries.map((entry) => {
              const tone = auditTone(entry.action);
              const dot =
                tone === "red" ? "bg-admin-red-700" : tone === "yellow" ? "bg-admin-gold-600" : "bg-admin-green-700";
              return (
                <li key={entry.id} className="flex items-start gap-2.5 border-b border-admin-border px-[18px] py-3">
                  <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <div className="min-w-0">
                    <p className="text-[13.5px] leading-snug text-admin-ink">{auditCopy(entry)}</p>
                    <p className="mt-0.5 text-[12px] text-admin-ink-faint">
                      {formatAuditWhen(entry.createdAt)}
                      {entry.parishName ? ` · ${entry.parishName}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col items-center gap-1.5 px-[18px] py-4">
            {hasMore ? (
              <button
                type="button"
                onClick={showOlder}
                disabled={loadingOlder}
                className="rounded-lg border border-admin-border bg-white px-3.5 py-2 text-[13.5px] font-semibold text-admin-ink hover:bg-admin-surface-alt disabled:opacity-60"
              >
                {loadingOlder ? "Loading…" : "Show older"}
              </button>
            ) : (
              <p className="text-[13px] text-admin-ink-faint">That's the start of the log.</p>
            )}
            {olderError ? <p className="text-[13px] text-admin-red-700">{olderError}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}

const menuRow =
  "block w-full px-3 py-2 text-left text-[13.5px] text-admin-ink-muted hover:bg-admin-green-100 hover:text-admin-green-900";

function FilterChip({
  open,
  label,
  onToggle,
  children,
}: {
  open: boolean;
  label: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border bg-white px-3 py-[7px] text-[13.5px] text-admin-ink-muted"
      >
        <ChevronDownIcon className="h-[11px] w-[11px]" />
        <span className="max-w-[180px] truncate">{label}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-1 min-w-[150px] overflow-hidden rounded-lg border border-admin-border bg-white shadow-[0_8px_24px_rgba(20,30,25,0.10)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
