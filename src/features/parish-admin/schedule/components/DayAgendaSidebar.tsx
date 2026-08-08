// src/features/parish-admin/schedule/components/DayAgendaSidebar.tsx
import { useNavigate } from "react-router";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { markRecordStatus } from "../api/scheduleApi";
import { getRecordFormPath, getRecordFormPrefill } from "../recordLinkHelpers";
import { EVENT_TYPE_LABELS, EVENT_TYPE_STYLES } from "../types";
import type { ScheduleOccurrence } from "../types";

interface DayAgendaSidebarProps {
  dateStr: string;
  occurrences: ScheduleOccurrence[];
  todayStr: string;
  onAdd: () => void;
  onAssign: (occurrence: ScheduleOccurrence) => void;
  onChanged: () => void;
}

export function DayAgendaSidebar({ dateStr, occurrences, todayStr, onAdd, onAssign, onChanged }: DayAgendaSidebarProps) {
  const navigate = useNavigate();
  const d = new Date(dateStr + "T00:00:00");
  const isToday = dateStr === todayStr;

  async function handleInputRecord(o: ScheduleOccurrence) {
    const path = getRecordFormPath(o);
    if (path) {
      navigate(path, { state: getRecordFormPrefill(o) });
      return;
    }
    await markRecordStatus(o.id, "Recorded");
    onChanged();
  }

  async function handleMarkRecorded(o: ScheduleOccurrence) {
    await markRecordStatus(o.id, "Recorded");
    onChanged();
  }

  return (
    <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-serif text-[15px] font-semibold text-admin-ink">
            {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <p className="mt-0.5 text-[12px] text-admin-ink-muted">
            {isToday ? "Today · " : ""}
            {occurrences.length} event{occurrences.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-admin-green-700 text-white hover:bg-admin-green-800"
          title="Add to this date"
        >
          +
        </button>
      </div>

      {occurrences.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-admin-border-strong px-4 py-8 text-center">
          <p className="text-[13px] font-semibold text-admin-ink">Nothing scheduled</p>
          <p className="mt-1 text-[12px] text-admin-ink-muted">Click + to add a Mass, blessing, or event.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {occurrences.map((o) => {
            const sourceLabel = o.source === "recurring" ? "Recurring" : o.source === "manual" ? "Manual" : `Auto · ${o.source}`;
            return (
              <div key={o.id} className="rounded-[10px] border border-admin-border bg-admin-surface-alt p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11.5px] font-semibold text-admin-ink-muted">
                      {o.start} – {o.end}
                    </p>
                    <p className="mt-0.5 text-[13.5px] font-semibold text-admin-ink">{o.title}</p>
                  </div>
                  <button
                    onClick={() => onAssign(o)}
                    className="whitespace-nowrap shrink-0 rounded-md border border-admin-border px-2 py-1 text-[11px] font-semibold text-admin-ink-muted hover:bg-admin-surface"
                  >
                    {o.assignee ? "Reassign" : "Assign"}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${EVENT_TYPE_STYLES[o.type].tag}`}>
                    {EVENT_TYPE_LABELS[o.type]}
                  </span>
                  <span className="text-[11px] text-admin-ink-faint">
                    {sourceLabel}
                    {o.assignee ? ` · ${o.assignee}` : " · Unassigned"}
                  </span>
                </div>
                {o.recordStatus && (
                  <div className="mt-2">
                    <AdminBadge tone={o.recordStatus === "Pending" ? "gold" : "green"}>{o.recordStatus}</AdminBadge>
                  </div>
                )}
                {o.recordStatus === "Pending" && (
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => handleInputRecord(o)}
                      className="whitespace-nowrap shrink-0 rounded-md bg-admin-green-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-admin-green-800"
                    >
                      Input record
                    </button>
                    <button
                      onClick={() => handleMarkRecorded(o)}
                      className="whitespace-nowrap shrink-0 rounded-md border border-admin-border px-2.5 py-1 text-[11px] font-semibold text-admin-ink-muted hover:bg-admin-surface"
                    >
                      Already recorded
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}