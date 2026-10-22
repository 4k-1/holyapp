// src/features/parish-admin/schedule/components/DayAgendaSidebar.tsx
import { useNavigate } from "react-router";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { markRecordStatus } from "../api/scheduleApi";
import { getRecordFormPath, getRecordFormPrefill } from "../recordLinkHelpers";
import { ScheduleKebabMenu } from "./ScheduleKebabMenu";
import { EVENT_TYPE_STYLES } from "@/features/parish-admin/schedule/eventTypeStyles";
import type { ScheduleOccurrence } from "../types";

interface DayAgendaSidebarProps {
  dateStr: string;
  occurrences: ScheduleOccurrence[];
  todayStr: string;
  onAdd: () => void;
  onAssign: (occurrence: ScheduleOccurrence) => void;
  onChanged: () => void;
  onViewAssignee: (assignee: string) => void;
}

export function DayAgendaSidebar({
  dateStr,
  occurrences,
  todayStr,
  onAdd,
  onAssign,
  onChanged,
  onViewAssignee,
}: DayAgendaSidebarProps) {
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
          <p className="font-serif text-admin-page font-semibold text-admin-ink">
            {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
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
          <p className="text-admin-body font-semibold text-admin-ink">Nothing scheduled</p>
          <p className="mt-1 text-admin-support text-admin-ink-muted">Click + to add a Mass, blessing, or event.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {occurrences.map((o) => {
            const sourceLabel = o.source === "recurring" ? "Recurring" : o.source === "manual" ? "Manual" : `Auto · ${o.source}`;
            return (
              <div key={o.id} className={`rounded-[10px] p-3 ${EVENT_TYPE_STYLES[o.type].card}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-admin-label font-semibold text-admin-ink-muted">
                      {o.start} – {o.end}
                    </p>
                    <p className="mt-0.5 text-admin-body font-semibold text-admin-ink">{o.title}</p>
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
                      !!o.assignee && {
                        label: `View all for ${o.assignee}`,
                        onClick: () => onViewAssignee(o.assignee),
                      },
                    ]}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="text-admin-support text-admin-ink-muted">{sourceLabel}</span>
                  <span className="text-admin-support text-admin-ink-muted">·</span>
                  {o.assignee ? (
                    <button
                      type="button"
                      onClick={() => onViewAssignee(o.assignee)}
                      className="text-admin-support font-semibold text-admin-green-700 hover:underline"
                      title={`View all events for ${o.assignee}`}
                    >
                      {o.assignee}
                    </button>
                  ) : (
                    <span className="text-admin-support text-admin-ink-muted">Unassigned</span>
                  )}
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