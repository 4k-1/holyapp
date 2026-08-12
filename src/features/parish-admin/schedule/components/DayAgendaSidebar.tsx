// src/features/parish-admin/schedule/components/DayAgendaSidebar.tsx
import { useNavigate } from "react-router";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { markRecordStatus } from "../api/scheduleApi";
import { getRecordFormPath, getRecordFormPrefill } from "../recordLinkHelpers";
import { ScheduleKebabMenu } from "./ScheduleKebabMenu";
import { EVENT_TYPE_STYLES, EVENT_TYPE_LABELS } from "@/features/parish-admin/schedule/eventTypeStyles";
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
    <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface p-4 shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-serif text-xl font-semibold text-admin-ink">
            {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <p className="mt-0.5 text-[12px] text-admin-ink-muted">
            {isToday ? "Today · " : ""}
            {occurrences.length} event{occurrences.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-admin-green-700 text-white hover:bg-admin-green-800"
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
              <div key={o.id} className={`rounded-[10px] p-3 ${EVENT_TYPE_STYLES[o.type].card}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11.5px] font-semibold text-admin-ink-muted">
                      {o.start} – {o.end}
                    </p>
                    <p className="mt-0.5 text-[13.5px] font-semibold text-admin-ink">{o.title}</p>
                  </div>
                  <ScheduleKebabMenu
                    items={[
                      o.recordStatus === "Pending" && {
                        label: "Input record",
                        primary: true,
                        onClick: () => handleInputRecord(o),
                      },
                      o.recordStatus === "Pending" && {
                        label: "Already recorded",
                        onClick: () => handleMarkRecorded(o),
                      },
                      { label: o.assignee ? "Reassign" : "Assign", onClick: () => onAssign(o) },
                    ]}
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[12px] text-admin-ink-muted">
                    {sourceLabel}
                    {o.assignee ? ` · ${o.assignee}` : " · Unassigned"}
                  </span>
                </div>
                {o.recordStatus && (
                  <div className="mt-2">
                    <AdminBadge tone={o.recordStatus === "Pending" ? "gold" : "green"}>{o.recordStatus}</AdminBadge>
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