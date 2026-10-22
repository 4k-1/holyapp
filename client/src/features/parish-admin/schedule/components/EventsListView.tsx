// src/features/parish-admin/schedule/components/EventsListView.tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { listAllBlocks, markRecordStatus } from "../api/scheduleApi";
import { getRecordFormPath, getRecordFormPrefill } from "../recordLinkHelpers";
import { parseTimeToMinutes, toISO } from "../scheduleHelpers";
import { EVENT_TYPE_LABELS, EVENT_TYPE_STYLES } from "../types";
import type { ScheduleBlock, ScheduleEventType } from "../types";

const TODAY_ISO = toISO(new Date());

interface EventsListViewProps {
  onViewDay: (dateStr: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export function EventsListView({ onViewDay, searchQuery, onSearchQueryChange }: EventsListViewProps) {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"All" | ScheduleEventType>("All");
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
  }, [fetchBlocks]);

  async function handleInputRecord(b: ScheduleBlock) {
    const path = getRecordFormPath(b);
    if (path) {
      navigate(path, { state: getRecordFormPrefill(b) });
      return;
    }
    await markRecordStatus(b.id, "Recorded");
    load();
  }

  const q = searchQuery.trim().toLowerCase();
  let filtered = [...blocks];
  if (q) {
    filtered = filtered.filter(
      (b) =>
        b.assignee.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        EVENT_TYPE_LABELS[b.type].toLowerCase().includes(q) ||
        (!b.assignee && "unassigned".includes(q))
    );
  }
  if (typeFilter !== "All") filtered = filtered.filter((b) => b.type === typeFilter);
  if (dateFrom) filtered = filtered.filter((b) => b.date >= dateFrom);
  if (dateTo) filtered = filtered.filter((b) => b.date <= dateTo);
  filtered.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start);
  });

  const types = Object.keys(EVENT_TYPE_LABELS) as ScheduleEventType[];
  const trimmed = searchQuery.trim();
  const rangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
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
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="whitespace-nowrap text-admin-support font-semibold text-admin-green-700 hover:underline"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

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
            <tr className="border-b border-admin-border bg-admin-surface-alt text-admin-label font-semibold uppercase tracking-wide text-admin-ink-muted">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Time</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Assigned to</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading || rangeInvalid ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-admin-ink-muted">
                  {rangeInvalid ? "Adjust the date range to continue." : "Loading…"}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-admin-ink-muted">
                  {trimmed || dateFrom || dateTo
                    ? "No events in this range. Try different dates or clear the search."
                    : "Nothing here. Try a date range, or add one with \"Add block\"."}
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const isPast = b.date < TODAY_ISO;
                return (
                  <tr key={b.id} className="border-b border-admin-border last:border-b-0">
                    <td className="px-4 py-2.5">
                      {new Date(b.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {b.start} – {b.end}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-admin-label font-semibold ${EVENT_TYPE_STYLES[b.type].tag}`}>
                        {EVENT_TYPE_LABELS[b.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-admin-ink">{b.title}</td>
                    <td className="px-4 py-2.5">
                      {b.assignee ? (
                        <button
                          type="button"
                          onClick={() => onSearchQueryChange(b.assignee)}
                          className="text-admin-support font-semibold text-admin-green-700 hover:underline"
                        >
                          {b.assignee}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {b.recordStatus ? (
                        <AdminBadge tone={b.recordStatus === "Pending" ? "gold" : "green"}>{b.recordStatus}</AdminBadge>
                      ) : (
                        <AdminBadge tone={isPast ? "muted" : "green"}>{isPast ? "Past" : "Upcoming"}</AdminBadge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewDay(b.date)}
                          className="whitespace-nowrap shrink-0 text-admin-support font-semibold text-admin-green-700 hover:underline"
                        >
                          View day
                        </button>
                        {b.recordStatus === "Pending" && (
                          <button
                            onClick={() => handleInputRecord(b)}
                            className="whitespace-nowrap shrink-0 text-admin-support font-semibold text-admin-green-700 hover:underline"
                          >
                            Input record
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
