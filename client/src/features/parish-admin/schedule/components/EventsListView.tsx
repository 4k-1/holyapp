// src/features/parish-admin/schedule/components/EventsListView.tsx
import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminRowActions } from "@/components/ui/AdminRowActions";
import { AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { EVENT_TYPE_STYLES } from "@/features/parish-admin/schedule/eventTypeStyles";
import { listAllBlocks, markRecordStatus } from "../api/scheduleApi";
import { getRecordFormPath, getRecordFormPrefill, isBatchEvent } from "../recordLinkHelpers";
import { RecordedEntries } from "./RecordedEntries";
import { parseTimeToMinutes, toISO } from "../scheduleHelpers";
import { EVENT_TYPE_LABELS } from "../types";
import type { ScheduleBlock, ScheduleEventType, ScheduleOccurrence } from "../types";
import { AssigneeName } from "./StaffSelect";

const TODAY = new Date();
const TODAY_ISO = toISO(TODAY);

/** A date heading: "Fri, Oct 23", with the year when it isn't this year. */
function heading(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.slice(0, 4) !== TODAY_ISO.slice(0, 4) && { year: "numeric" }),
  });
}

type Range = "upcoming" | "week" | "month" | "past" | "all" | "custom";

const RANGES: { key: Range; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "past", label: "Past" },
  { key: "all", label: "All dates" },
  { key: "custom", label: "Custom…" },
];

/** The first and last date of a range, as yyyy-mm-dd; "" means open-ended. */
function rangeBounds(range: Range, from: string, to: string): [string, string] {
  const y = TODAY.getFullYear();
  const m = TODAY.getMonth();
  switch (range) {
    case "upcoming":
      return [TODAY_ISO, ""];
    case "week": {
      const sunday = new Date(y, m, TODAY.getDate() - TODAY.getDay());
      return [toISO(sunday), toISO(new Date(y, m, sunday.getDate() + 6))];
    }
    case "month":
      return [toISO(new Date(y, m, 1)), toISO(new Date(y, m + 1, 0))];
    case "past":
      return ["", toISO(new Date(y, m, TODAY.getDate() - 1))];
    case "custom":
      return [from, to];
    default:
      return ["", ""];
  }
}

/** The problems the office looks for: sacraments not yet in the register, and events nobody is taking. */
type Problem = "record" | "unassigned";

const needsRecording = (b: ScheduleBlock) => b.recordStatus === "Pending" && b.date <= TODAY_ISO;
const unassigned = (b: ScheduleBlock) => !b.assignee && b.date >= TODAY_ISO;

interface EventsListViewProps {
  onViewDay: (dateStr: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  /** Opens the edit dialog for an event added by hand. */
  onEdit: (block: ScheduleBlock) => void;
  /** Opens the assign dialog. */
  onAssign: (occurrence: ScheduleOccurrence) => void;
  /** Changes when the parent saved an event, so the list fetches again. */
  reloadKey: number;
  /** Start on past sacraments still to be written in the register (from the dashboard). */
  initialNeedsRecording?: boolean;
}

export function EventsListView({
  onViewDay,
  searchQuery,
  onSearchQueryChange,
  onEdit,
  onAssign,
  reloadKey,
  initialNeedsRecording = false,
}: EventsListViewProps) {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"All" | ScheduleEventType>("All");
  const [range, setRange] = useState<Range>("upcoming");
  // A problem chip looks across every date, so it sets the date range aside while it's on.
  const [problem, setProblem] = useState<Problem | null>(initialNeedsRecording ? "record" : null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchBlocks = useCallback(
    () =>
      listAllBlocks().then((all) => {
        setBlocks(all);
        setLoading(false);
      }),
    []
  );

  function load() {
    setLoading(true);
    return fetchBlocks();
  }

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks, reloadKey]);

  async function handleInputRecord(b: ScheduleBlock) {
    const path = getRecordFormPath(b);
    if (path) {
      navigate(path, { state: getRecordFormPrefill(b) });
      return;
    }
    await markRecordStatus(b.id, "Recorded");
    load();
  }

  const assign = (b: ScheduleBlock) => onAssign({ ...b, isRecurringOccurrence: false });

  // Search and type first; the problem counts are taken from what's left.
  const q = searchQuery.trim().toLowerCase();
  let searched = blocks;
  if (q) {
    searched = searched.filter(
      (b) =>
        b.assignee.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        EVENT_TYPE_LABELS[b.type].toLowerCase().includes(q) ||
        (!b.assignee && "unassigned".includes(q))
    );
  }
  if (typeFilter !== "All") searched = searched.filter((b) => b.type === typeFilter);
  const recordCount = searched.filter(needsRecording).length;
  const unassignedCount = searched.filter(unassigned).length;

  const [from, to] = rangeBounds(range, dateFrom, dateTo);
  const rangeInvalid = !problem && range === "custom" && Boolean(dateFrom && dateTo && dateFrom > dateTo);
  let filtered: ScheduleBlock[];
  if (problem) {
    filtered = searched.filter(problem === "record" ? needsRecording : unassigned);
  } else {
    filtered = searched.filter((b) => (!from || b.date >= from) && (!to || b.date <= to));
  }
  // Looking back, the latest comes first.
  const newestFirst = !problem && range === "past";
  filtered = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return (a.date < b.date ? -1 : 1) * (newestFirst ? -1 : 1);
    return parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start);
  });

  const types = Object.keys(EVENT_TYPE_LABELS) as ScheduleEventType[];
  const trimmed = searchQuery.trim();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 w-full sm:max-w-[280px]">
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
            placeholder="Search by priest or minister…"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-[34px]"
            aria-label="Search by priest or minister"
          />
        </div>
        <AdminSelect
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "All" | ScheduleEventType)}
          aria-label="Filter by event type"
          className="w-full sm:w-auto"
        >
          <option value="All">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </AdminSelect>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dates">
          {RANGES.map((r) => (
            <Chip
              key={r.key}
              on={!problem && range === r.key}
              onClick={() => {
                setRange(r.key);
                setProblem(null);
              }}
            >
              {r.label}
            </Chip>
          ))}
        </div>
        <span className="hidden h-5 w-px bg-admin-border sm:block" aria-hidden="true" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Needs attention">
          <Chip tone="amber" on={problem === "record"} onClick={() => setProblem(problem === "record" ? null : "record")}>
            Needs recording <Count n={recordCount} on={problem === "record"} />
          </Chip>
          <Chip tone="amber" on={problem === "unassigned"} onClick={() => setProblem(problem === "unassigned" ? null : "unassigned")}>
            Unassigned <Count n={unassignedCount} on={problem === "unassigned"} />
          </Chip>
        </div>
      </div>

      {!problem && range === "custom" && (
        <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
          <AdminInput
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="!w-full sm:!w-auto"
          />
          <span className="text-admin-support text-admin-ink-muted">to</span>
          <AdminInput
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="!w-full sm:!w-auto"
          />
        </div>
      )}

      {rangeInvalid && (
        <p className="mb-3 text-admin-body text-admin-red-700">From date must be on or before To date.</p>
      )}

      {trimmed && !rangeInvalid && (
        <p className="mb-3 text-admin-body text-admin-ink-muted">
          Results for <span className="font-semibold text-admin-ink">{trimmed}</span>
        </p>
      )}

      <div className="overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface">
        <table className="w-full text-left text-admin-support">
          <thead>
            <tr className="border-b border-admin-border bg-admin-surface-alt text-[0.75rem] font-medium text-admin-ink-muted">
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Assigned to</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading || rangeInvalid ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-admin-ink-muted">
                  {rangeInvalid ? "Adjust the date range to continue." : "Loading…"}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-admin-ink-muted">
                  {problem === "record"
                    ? "Every sacrament so far is in the register."
                    : problem === "unassigned"
                      ? "Every upcoming event has someone assigned."
                      : trimmed
                        ? "No events match. Try other dates or clear the search."
                        : "No events in these dates."}
                </td>
              </tr>
            ) : (
              filtered.map((b, i) => {
                const isPast = b.date < TODAY_ISO;
                const newDay = i === 0 || filtered[i - 1].date !== b.date;
                const typeLabel = EVENT_TYPE_LABELS[b.type];
                const pending = b.recordStatus === "Pending";
                return (
                  <Fragment key={b.id}>
                    {newDay && (
                      <tr className="border-b border-admin-border bg-admin-green-050/70">
                        <th colSpan={5} scope="colgroup" className="px-5 py-2 text-admin-support font-semibold text-admin-green-900">
                          <span className="flex items-center gap-2">
                            {heading(b.date)}
                            {b.date === TODAY_ISO && (
                              <span className="rounded-full bg-admin-green-700 px-2 py-0.5 text-admin-label text-white">Today</span>
                            )}
                          </span>
                        </th>
                      </tr>
                    )}
                    {/* Past events fade back, unless they still need recording. */}
                    <tr className={`border-b border-admin-border last:border-b-0 ${isPast && !pending ? "opacity-60" : ""}`}>
                      <td className="px-5 py-3 whitespace-nowrap tabular-nums">
                        {b.start} – {b.end}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-[0.4rem] h-2 w-2 shrink-0 rounded-full ${EVENT_TYPE_STYLES[b.type].dot}`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-admin-ink">{b.title}</p>
                            {b.title.trim().toLowerCase() !== typeLabel.toLowerCase() && (
                              <p className="text-admin-label text-admin-ink-muted">{typeLabel}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {b.assignee ? (
                          <button
                            type="button"
                            onClick={() => onSearchQueryChange(b.assignee)}
                            className="text-admin-support font-semibold text-admin-green-700 hover:underline"
                            title={`Show all events for ${b.assignee}`}
                          >
                            <AssigneeName name={b.assignee} guest={b.guest} />
                          </button>
                        ) : isPast ? (
                          <span className="text-admin-ink-muted">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => assign(b)}
                            className="text-admin-support font-semibold text-admin-amber-700 hover:underline"
                            title="Assign a priest or minister"
                          >
                            Unassigned
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {b.recordStatus && (
                          <>
                            <AdminBadge tone={pending ? "gold" : "green"}>{pending ? "Needs recording" : "Recorded"}</AdminBadge>
                            <RecordedEntries entries={b.recorded} />
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <AdminRowActions
                          label={`Actions for ${b.title}`}
                          actions={[
                            {
                              label: isBatchEvent(b.type) ? "Add a register entry" : "Input record",
                              onSelect: () => handleInputRecord(b),
                              hidden: !pending,
                            },
                            {
                              label: isBatchEvent(b.type) ? "All recorded" : "Already recorded",
                              onSelect: () => markRecordStatus(b.id, "Recorded").then(load),
                              hidden: !pending,
                            },
                            { label: b.assignee ? "Reassign" : "Assign", onSelect: () => assign(b) },
                            { label: "View day", onSelect: () => onViewDay(b.date) },
                            { label: "Edit", onSelect: () => onEdit(b), hidden: b.source !== "manual" },
                          ]}
                        />
                      </td>
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  tone = "green",
  children,
}: {
  on: boolean;
  onClick: () => void;
  tone?: "green" | "amber";
  children: ReactNode;
}) {
  const onClass =
    tone === "amber" ? "border-admin-amber-700 bg-admin-amber-100 text-admin-amber-700" : "border-admin-green-700 bg-admin-green-700 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-8 whitespace-nowrap rounded-full border px-3 text-admin-support font-medium ${
        on ? onClass : "border-admin-border bg-admin-surface text-admin-ink hover:bg-admin-surface-alt"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ n, on }: { n: number; on: boolean }) {
  return (
    <span className={`ml-0.5 tabular-nums ${on ? "" : n > 0 ? "font-semibold text-admin-amber-700" : "text-admin-ink-muted"}`}>
      {n}
    </span>
  );
}
