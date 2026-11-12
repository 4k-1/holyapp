import { EVENT_TYPE_STYLES } from "@/features/parish-admin/schedule/eventTypeStyles";
import { EVENT_TYPE_LABELS } from "../types";
import type { ScheduleEventType } from "../types";

/** The colour key, in the order the office meets them most. */
const KEY_TYPES: ScheduleEventType[] = [
  "baptism",
  "confirmation",
  "wedding",
  "funeral",
  "blessing",
  "interview",
  "mass",
  "novena",
  "manual",
];

/** What each event colour means, shown under the calendar and the list. */
export function EventTypeKey({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-1.5 gap-y-1.5 ${className}`} aria-label="Colour key">
      {KEY_TYPES.map((t) => (
        <li key={t} className={`rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-tight ${EVENT_TYPE_STYLES[t].tag}`}>
          {EVENT_TYPE_LABELS[t]}
        </li>
      ))}
    </ul>
  );
}
