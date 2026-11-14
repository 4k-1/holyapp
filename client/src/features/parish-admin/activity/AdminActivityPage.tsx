import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { auditCopy, auditTone, formatAuditWhen } from "@/lib/auditCopy";
import { ChevronDownIcon } from "@/components/ui/icons/AdminIcons";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";
import { ACCESS_AREAS, ACCESS_LEVELS, normalizeAccess } from "@/features/parish-admin/access";
import { listStaffAccounts } from "@/features/parish-admin/settings/api/staffApi";
import {
  listParishActivity,
  type ActivityArea,
  type ActivityFilters,
  type ActivityKind,
} from "./api/activityApi";
import type { AuditLogEntry } from "@/types";

const AREAS: { id: ActivityArea; label: string }[] = [
  ...ACCESS_AREAS.map((a) => ({ id: a.key as ActivityArea, label: a.label })),
  { id: "accounts", label: "Accounts & sign-ins" },
];

const KINDS: { id: ActivityKind; label: string }[] = [
  { id: "green", label: "Everyday activity" },
  { id: "yellow", label: "Voids, removals and withdrawals" },
  { id: "red", label: "Failed sign-ins" },
];

/**
 * Who did what in this parish, newest first. Admins only: it includes staff access changes and sign-ins.
 * The filters run on the server, so they search the whole log, not only what has been loaded.
 */
export function AdminActivityPage() {
  const { data: people = [] } = useAsync(() => listStaffAccounts(), []);
  const [actorId, setActorId] = useState("");
  const [area, setArea] = useState<ActivityArea | "">("");
  const [kind, setKind] = useState<ActivityKind | "">("");

  const filters: ActivityFilters = { actorId: actorId || undefined, area: area || undefined, kind: kind || undefined };
  const { data: firstPage, loading, error } = useAsync(() => listParishActivity(filters), [actorId, area, kind]);

  const [older, setOlder] = useState<AuditLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // A new first page (a new filter) drops the older entries loaded for the last one.
  const [shownPage, setShownPage] = useState(firstPage);
  if (shownPage !== firstPage) {
    setShownPage(firstPage);
    setOlder([]);
    setOlderError("");
    setHasMore(firstPage?.hasMore ?? false);
  }

  const entries = [...(firstPage?.entries ?? []), ...older];
  const filtered = Boolean(actorId || area || kind);

  async function showOlder() {
    const last = entries.at(-1);
    if (!last) return;
    setLoadingOlder(true);
    setOlderError("");
    try {
      const next = await listParishActivity({ ...filters, beforeId: last.id });
      setOlder((list) => [...list, ...next.entries]);
      setHasMore(next.hasMore);
    } catch {
      setOlderError("Couldn't load older entries. Try again.");
    } finally {
      setLoadingOlder(false);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Activity"
        description="Everything done in this parish's office and accounts, newest first. Only admins can see this page."
      />

      <AdminCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-2.5 border-b border-admin-border px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center">
          <AdminSelect
            aria-label="Person"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className="sm:w-[210px]"
          >
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            aria-label="Area"
            value={area}
            onChange={(e) => setArea(e.target.value as ActivityArea | "")}
            className="sm:w-[210px]"
          >
            <option value="">All areas</option>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            aria-label="Kind of activity"
            value={kind}
            onChange={(e) => setKind(e.target.value as ActivityKind | "")}
            className="sm:w-[230px]"
          >
            <option value="">All activity</option>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </AdminSelect>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setActorId("");
                setArea("");
                setKind("");
              }}
              className="self-start text-admin-body font-semibold text-admin-green-700 hover:text-admin-green-600 sm:self-center"
            >
              Clear filters
            </button>
          )}
        </div>

        {error ? (
          <p className="px-4 py-10 text-center text-admin-body text-admin-red-700">
            Couldn't load the activity. Refresh the page to try again.
          </p>
        ) : loading ? (
          <p className="px-4 py-10 text-center text-admin-body text-admin-ink-faint">Loading activity…</p>
        ) : entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-admin-body text-admin-ink-faint">
            {filtered ? "Nothing matches these filters." : "Nothing has been recorded yet."}
          </p>
        ) : (
          <>
            <ul>
              {entries.map((entry) => (
                <ActivityRow
                  key={entry.id}
                  entry={entry}
                  open={openId === entry.id}
                  onToggle={() => setOpenId((id) => (id === entry.id ? null : entry.id))}
                />
              ))}
            </ul>
            <div className="flex flex-col items-center gap-1.5 px-4 py-4">
              {hasMore ? (
                <button
                  type="button"
                  onClick={showOlder}
                  disabled={loadingOlder}
                  className="rounded-lg border border-admin-border bg-white px-3.5 py-2 text-admin-body font-semibold text-admin-ink hover:bg-admin-surface-alt disabled:opacity-60"
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
      </AdminCard>
    </AdminPage>
  );
}

function ActivityRow({ entry, open, onToggle }: { entry: AuditLogEntry; open: boolean; onToggle: () => void }) {
  const tone = auditTone(entry.action);
  const dot = tone === "red" ? "bg-admin-red-700" : tone === "yellow" ? "bg-admin-gold-600" : "bg-admin-green-700";
  const access = accessChanges(entry.metadata.areaAccess);
  const details = detailRows(entry.metadata);
  const hasDetails = access.length > 0 || details.length > 0;

  const summary = (
    <>
      <span className={`mt-[6px] h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] leading-snug text-admin-ink">{auditCopy(entry)}</span>
        <span className="mt-0.5 block text-[12px] text-admin-ink-faint">{formatAuditWhen(entry.createdAt)}</span>
      </span>
    </>
  );

  if (!hasDetails) {
    return <li className="flex items-start gap-2.5 border-b border-admin-border px-4 py-3">{summary}</li>;
  }

  return (
    <li className="border-b border-admin-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-admin-surface-alt"
      >
        {summary}
        <ChevronDownIcon
          className={`mt-1 h-3 w-3 shrink-0 text-admin-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="pb-3.5 pl-[34px] pr-4">
          {access.length > 0 && (
            <div className="mb-2.5">
              <p className="mb-1 text-[12px] font-semibold text-admin-ink-muted">Area access</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
                {access.map((row) => (
                  <div key={row.label} className="contents">
                    <dt className="text-admin-ink-muted">{row.label}</dt>
                    <dd className="text-admin-ink">
                      {row.from ? (
                        <>
                          <span className="text-admin-ink-faint">{row.from}</span> → <strong>{row.to}</strong>
                        </>
                      ) : (
                        row.to
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {details.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
              {details.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-admin-ink-muted">{row.label}</dt>
                  <dd className="break-words text-admin-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </li>
  );
}

const levelLabel = (key: string) => ACCESS_LEVELS.find((l) => l.key === key)?.label ?? key;

/**
 * Staff access in an entry, area by area. A change ({ from, to }) lists only the areas that changed;
 * a new account lists what it was given.
 */
function accessChanges(value: unknown): { label: string; from?: string; to: string }[] {
  if (!value || typeof value !== "object") return [];
  const v = value as Record<string, unknown>;
  if ("to" in v) {
    const from = normalizeAccess(v.from as Record<string, string> | null);
    const to = normalizeAccess(v.to as Record<string, string> | null);
    return ACCESS_AREAS.filter((a) => from[a.key] !== to[a.key]).map((a) => ({
      label: a.label,
      from: levelLabel(from[a.key]),
      to: levelLabel(to[a.key]),
    }));
  }
  const given = normalizeAccess(v as Record<string, string> | null);
  return ACCESS_AREAS.map((a) => ({ label: a.label, to: levelLabel(given[a.key]) }));
}

// Plain-language names for the details the server keeps with an entry.
const LABELS: Record<string, string> = {
  email: "Email",
  role: "Access",
  reason: "Reason",
  note: "Note",
  amount: "Amount",
  method: "Paid by",
  type: "Type",
  receiptNo: "Receipt no.",
  code: "Certificate code",
  releasedTo: "Released to",
  validId: "ID shown",
  sacrament: "Sacrament",
  sacramentType: "Sacrament",
  delivery: "Delivery",
  purpose: "Purpose",
  bookNumber: "Book",
  pageNumber: "Page",
  entryNumber: "Entry",
  volumeLabel: "Volume",
  records: "Records on the page",
  groom: "Groom",
  bride: "Bride",
  weddingParish: "Wedding parish",
  name: "Name",
  label: "Name",
  date: "Date",
  time: "Time",
  start: "Starts",
  end: "Ends",
  status: "Status",
  portal: "Signed in at",
  annotationType: "Note type",
  source: "Source",
  guest: "Requested by a guest",
  donation: "Offering",
  sundays: "Sundays",
  complete: "Complete",
  circumstances: "Circumstances",
  documentDate: "Document date",
};

const ROLE_WORDS: Record<string, string> = {
  parish_admin: "Admin",
  parish_staff: "Staff",
  parishioner: "Parishioner",
  super_admin: "Platform admin",
};

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function showValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if ((key === "amount" || key === "donation") && typeof value === "number") return peso.format(value);
  if ((key === "amount" || key === "donation") && typeof value === "string" && !Number.isNaN(Number(value))) {
    return peso.format(Number(value));
  }
  if (key === "role" && typeof value === "string") return ROLE_WORDS[value] ?? value;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

/** The other details an entry carries, skipping internal ids and anything that isn't a plain value. */
function detailRows(metadata: Record<string, unknown>): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(metadata ?? {})) {
    // Ids mean nothing to a reader; "validId" is the kind of ID shown, so it stays.
    if (key === "areaAccess" || key === "two_factor" || key === "portal") continue;
    if (key !== "validId" && (key === "id" || /Id$/.test(key) || /_id$/.test(key))) continue;
    const value = showValue(key, raw);
    if (value === null) continue;
    rows.push({ label: LABELS[key] ?? humanise(key), value });
  }
  return rows;
}

function humanise(key: string) {
  const words = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
