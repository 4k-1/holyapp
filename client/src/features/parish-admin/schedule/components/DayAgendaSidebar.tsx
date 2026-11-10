// src/features/parish-admin/schedule/components/DayAgendaSidebar.tsx
import { useNavigate } from "react-router";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { markRecordStatus } from "../api/scheduleApi";
import { getRecordFormPath, getRecordFormPrefill, isBatchEvent } from "../recordLinkHelpers";
import { RecordedEntries } from "./RecordedEntries";
import { ScheduleKebabMenu } from "./ScheduleKebabMenu";
import { AssigneeName } from "./StaffSelect";
import { EVENT_TYPE_STYLES } from "@/features/parish-admin/schedule/eventTypeStyles";
import { EVENT_TYPE_LABELS } from "../types";
import type { LiturgicalDay, ScheduleOccurrence } from "../types";

interface DayAgendaSidebarProps {
  dateStr: string;
  occurrences: ScheduleOccurrence[];
  /** Regular Mass times for the day, from Settings → Mass Schedule. Shown for context, not as events. */
  massTimes?: string[];
  /** The day in the Church calendar (B5 + C5). */
  liturgicalDay?: LiturgicalDay;
  todayStr: string;
  onAdd: () => void;
  onAssign: (occurrence: ScheduleOccurrence) => void;
  /** Opens the edit dialog; only offered for events added by hand. */
  onEdit: (occurrence: ScheduleOccurrence) => void;
  onChanged: () => void;
  onViewAssignee: (assignee: string) => void;
}

export function DayAgendaSidebar({
  dateStr,
  occurrences,
  massTimes = [],
  liturgicalDay,
  todayStr,
  onAdd,
  onAssign,
  onEdit,
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
    <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-admin-border px-5 py-4">
        <div>
          <p className="text-admin-support font-medium text-admin-ink-muted">
            {isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "long" })}
          </p>
          <p className="mt-0.5 text-[1.25rem] font-semibold leading-tight text-admin-ink">
            {d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </p>
          <p className="mt-1 text-admin-support text-admin-ink-muted">
            {occurrences.length} event{occurrences.length !== 1 ? "s" : ""}
            {massTimes.length > 0 && ` · ${massTimes.length} ${massTimes.length === 1 ? "Mass" : "Masses"}`}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-admin-green-700 text-white shadow-sm hover:bg-admin-green-900"
          title="Add to this date"
          aria-label="Add to this date"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-4">
        {liturgicalDay && (
          <div className="mb-3">
            <p className="text-admin-label font-semibold uppercase tracking-wide text-admin-ink-muted">
              {liturgicalDay.seasonLabel}
            </p>
            {liturgicalDay.title && (
              <p className="mt-0.5 text-admin-body font-semibold text-admin-ink">{liturgicalDay.title}</p>
            )}
            {[...liturgicalDay.notes, ...liturgicalDay.local].map((note) => (
              <p key={note} className="mt-0.5 text-admin-support text-admin-gold-700">
                {note}
              </p>
            ))}
          </div>
        )}
        {massTimes.length > 0 && (
          <div className="mb-4 rounded-md bg-admin-green-050 px-3.5 py-2.5">
            <p className="text-admin-label font-semibold text-admin-green-900">Regular Masses</p>
            <p className="mt-0.5 text-admin-body tabular-nums text-admin-ink">{massTimes.join(" · ")}</p>
          </div>
        )}

        {occurrences.length === 0 ? (
          <div className="rounded-md border border-dashed border-admin-border-strong px-4 py-8 text-center">
            <p className="text-admin-body font-semibold text-admin-ink">
              {massTimes.length > 0 ? "Nothing else scheduled" : "Nothing scheduled"}
            </p>
            <p className="mt-1 text-admin-support text-admin-ink-muted">Click + to add a baptism, blessing, special Mass, or event.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {occurrences.map((o) => {
              const style = EVENT_TYPE_STYLES[o.type];
              const sourceLabel =
                o.source === "recurring" ? "Recurring" : o.source === "manual" ? "Added by hand" : `From ${o.source}`;
              return (
                <li key={o.id} className={`rounded-md px-3 py-2.5 ${style.card}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-admin-label font-semibold tabular-nums text-admin-ink-muted">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="12 7 12 12 15 14" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {o.start} – {o.end}
                    </span>
                    <ScheduleKebabMenu
                      items={[
                        o.recordStatus === "Pending" && {
                          label: isBatchEvent(o.type) ? "Add a register entry" : "Input record",
                          primary: true,
                          onClick: () => handleInputRecord(o),
                        },
                        // A baptism session is closed by hand once every child is in the register.
                        o.recordStatus === "Pending" && {
                          label: isBatchEvent(o.type) ? "All recorded" : "Already recorded",
                          onClick: () => handleMarkRecorded(o),
                        },
                        !o.isRecurringOccurrence && o.source === "manual" && { label: "Edit", onClick: () => onEdit(o) },
                        { label: o.assignee ? "Reassign" : "Assign", onClick: () => onAssign(o) },
                        !!o.assignee && {
                          label: `View all for ${o.assignee}`,
                          onClick: () => onViewAssignee(o.assignee),
                        },
                      ]}
                    />
                  </div>
                  <p className="mt-0.5 text-admin-body font-semibold text-admin-ink">{o.title}</p>
                  <RecordedEntries entries={o.recorded} />
                  {o.location && <p className="text-admin-support text-admin-ink-muted">{o.location}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className={`rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold ${style.pill ?? `${style.dot} text-white`}`}>
                      {EVENT_TYPE_LABELS[o.type]}
                    </span>
                    {o.recordStatus && (
                      <AdminBadge tone={o.recordStatus === "Pending" ? "gold" : "green"}>{o.recordStatus}</AdminBadge>
                    )}
                    {o.assignee ? (
                      <button
                        type="button"
                        onClick={() => onViewAssignee(o.assignee)}
                        className="text-admin-support font-semibold text-admin-green-700 hover:underline"
                        title={`View all events for ${o.assignee}`}
                      >
                        <AssigneeName name={o.assignee} guest={o.guest} />
                      </button>
                    ) : (
                      <span className="text-admin-support font-medium text-admin-amber-700">Unassigned</span>
                    )}
                    <span className="text-admin-support text-admin-ink-faint">· {sourceLabel}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
