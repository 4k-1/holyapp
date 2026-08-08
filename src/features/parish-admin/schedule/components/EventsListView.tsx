// src/features/parish-admin/schedule/components/EventsListView.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { listAllBlocks, markRecordStatus } from "../api/scheduleApi";
import { getRecordFormPath, getRecordFormPrefill } from "../recordLinkHelpers";
import { parseTimeToMinutes, toISO } from "../scheduleHelpers";
import { EVENT_TYPE_LABELS, EVENT_TYPE_STYLES } from "../types";
import type { ScheduleBlock, ScheduleEventType } from "../types";

const TODAY_ISO = toISO(new Date());

interface EventsListViewProps {
  onViewDay: (dateStr: string) => void;
}

export function EventsListView({ onViewDay }: EventsListViewProps) {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"All" | ScheduleEventType>("All");
  const [timeFilter, setTimeFilter] = useState<"Upcoming" | "Past" | "All">("Upcoming");

  async function loadBlocks() {
    setLoading(true);
    const data = await listAllBlocks();
    setBlocks(data);
    setLoading(false);
  }

  useEffect(() => {
    loadBlocks();
  }, []);

  async function handleInputRecord(b: ScheduleBlock) {
    const path = getRecordFormPath(b);
    if (path) {
      navigate(path, { state: getRecordFormPrefill(b) });
      return;
    }
    await markRecordStatus(b.id, "Recorded");
    loadBlocks();
  }

  let items = [...blocks];
  if (typeFilter !== "All") items = items.filter((b) => b.type === typeFilter);
  if (timeFilter === "Upcoming") items = items.filter((b) => b.date >= TODAY_ISO);
  if (timeFilter === "Past") items = items.filter((b) => b.date < TODAY_ISO);
  items.sort((a, b) => (a.date + parseTimeToMinutes(a.start) > b.date + parseTimeToMinutes(b.start) ? 1 : -1));

  const types = Object.keys(EVENT_TYPE_LABELS) as ScheduleEventType[];

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={typeFilter === "All"} onClick={() => setTypeFilter("All")}>
            All types
          </FilterChip>
          {types.map((t) => (
            <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {EVENT_TYPE_LABELS[t]}
            </FilterChip>
          ))}
        </div>
        <div className="inline-flex rounded-[10px] border border-admin-border bg-admin-surface-alt p-1">
          {(["Upcoming", "Past", "All"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`rounded-[7px] px-3 py-1.5 text-[12px] font-semibold transition ${
                timeFilter === t ? "bg-admin-surface text-admin-ink shadow-sm" : "text-admin-ink-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-admin-border bg-admin-surface-alt text-[10.5px] font-semibold uppercase tracking-wide text-admin-ink-muted">
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
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-admin-ink-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-admin-ink-muted">
                  Nothing here. Try a different type, time range, or add one with "Add block".
                </td>
              </tr>
            ) : (
              items.map((b) => {
                const isPast = b.date < TODAY_ISO;
                return (
                  <tr key={b.id} className="border-b border-admin-border last:border-b-0">
                    <td className="px-4 py-2.5">
                      {new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {b.start} – {b.end}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${EVENT_TYPE_STYLES[b.type].tag}`}>
                        {EVENT_TYPE_LABELS[b.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-admin-ink">{b.title}</td>
                    <td className="px-4 py-2.5">{b.assignee || "—"}</td>
                    <td className="px-4 py-2.5">
                      {b.recordStatus ? (
                        <AdminBadge tone={b.recordStatus === "Pending" ? "gold" : "green"}>{b.recordStatus}</AdminBadge>
                      ) : (
                        <AdminBadge tone={isPast ? "neutral" : "green"}>{isPast ? "Past" : "Upcoming"}</AdminBadge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewDay(b.date)}
                          className="whitespace-nowrap shrink-0 text-[12px] font-semibold text-admin-green-700 hover:underline"
                        >
                          View day
                        </button>
                        {b.recordStatus === "Pending" && (
                          <button
                            onClick={() => handleInputRecord(b)}
                            className="whitespace-nowrap shrink-0 text-[12px] font-semibold text-admin-green-700 hover:underline"
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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition ${
        active
          ? "border-admin-green-700 bg-admin-green-050 text-admin-green-800"
          : "border-admin-border text-admin-ink-muted hover:bg-admin-surface-alt"
      }`}
    >
      {children}
    </button>
  );
}