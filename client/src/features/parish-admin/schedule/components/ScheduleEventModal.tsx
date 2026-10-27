// src/features/parish-admin/schedule/components/ScheduleEventModal.tsx
import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { addScheduleBlock, checkConflict, listAssignableStaff, updateScheduleBlock } from "../api/scheduleApi";
import { convert24to12, to24Hour } from "../scheduleHelpers";
import { COMMON_LOCATIONS, EVENT_TYPE_LABELS } from "../types";
import type { AssignableStaff, ScheduleBlock, ScheduleConflict, ScheduleEventType } from "../types";
import { ConflictNotice } from "./ConflictNotice";
import { StaffSelect } from "./StaffSelect";

type PlaceKind = "parish" | "outside";

interface ScheduleEventModalProps {
  /** The event to edit; leave out to add a new one. */
  event?: ScheduleBlock;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Adds an event to the schedule, or edits one that was added by hand. */
export function ScheduleEventModal({ event, defaultDate, onClose, onSaved }: ScheduleEventModalProps) {
  const editing = Boolean(event);
  const startsOutside = Boolean(event?.location && !COMMON_LOCATIONS.includes(event.location));
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? defaultDate);
  const [start, setStart] = useState(event ? to24Hour(event.start) : "09:00");
  const [end, setEnd] = useState(event ? to24Hour(event.end) : "10:00");
  // No default for new events: the type sets the event's colour, so it should be a deliberate choice.
  const [type, setType] = useState<ScheduleEventType | "">(event?.type ?? "");
  const [placeKind, setPlaceKind] = useState<PlaceKind>(startsOutside ? "outside" : "parish");
  const [parishPlace, setParishPlace] = useState(
    event?.location && !startsOutside ? event.location : COMMON_LOCATIONS[0]
  );
  const [address, setAddress] = useState(startsOutside ? event?.location ?? "" : "");
  const [assignee, setAssignee] = useState(event?.assignee ?? "");
  const [conflict, setConflict] = useState<ScheduleConflict | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const location = placeKind === "parish" ? parishPlace : address.trim();

  useEffect(() => {
    listAssignableStaff().then(setStaff);
  }, []);

  // Events may overlap in time, just not in the same place or with the same priest.
  useEffect(() => {
    if (!date || !start || !end || start >= end) return;
    const t = setTimeout(async () => {
      const result = await checkConflict(date, convert24to12(start), convert24to12(end), {
        assignee: assignee || undefined,
        location: location || undefined,
        excludeId: event?.id,
      });
      setConflict(result);
    }, 250);
    return () => clearTimeout(t);
  }, [date, start, end, assignee, location, event?.id]);

  const timeInvalid = Boolean(start && end && start >= end);
  const canSubmit = Boolean(title.trim() && date && type && location && !timeInvalid && !conflict);

  async function handleSubmit() {
    if (!canSubmit || !type) return;
    setSubmitting(true);
    setError("");
    const input = {
      title: title.trim(),
      date,
      start: convert24to12(start),
      end: convert24to12(end),
      type,
      source: "manual",
      assignee,
      location,
    };
    try {
      if (event) await updateScheduleBlock(event.id, input);
      else await addScheduleBlock(input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-event-title"
        className="relative z-10 w-full max-w-[540px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
      >
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
          <h3 id="schedule-event-title" className="font-serif text-admin-section font-semibold text-admin-ink">
            {editing ? "Edit event" : "Add to schedule"}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-3.5 px-6 py-5">
          <AdminField label="Title" className="mb-0">
            <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. House Blessing — Cruz Residence" />
          </AdminField>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <AdminField label="Date" className="mb-0">
              <AdminInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </AdminField>
            <AdminField label="Start" className="mb-0">
              <AdminInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </AdminField>
            <AdminField label="End" className="mb-0">
              <AdminInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </AdminField>
          </div>
          {timeInvalid && <p className="text-admin-support text-red-700">The end time must be after the start time.</p>}

          <AdminField label="Type" className="mb-0">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ScheduleEventType)}
              aria-required="true"
              className={`w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body ${
                type ? "text-admin-ink" : "text-admin-ink-faint"
              }`}
            >
              <option value="" disabled>
                Choose a type
              </option>
              {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </AdminField>

          <fieldset>
            <legend className="mb-1.5 text-admin-label font-semibold text-admin-ink-muted">Place</legend>
            <div className="grid grid-cols-2 gap-2">
              <PlaceOption
                checked={placeKind === "parish"}
                onChange={() => setPlaceKind("parish")}
                title="At the parish"
                hint="Church, chapel, or hall"
              />
              <PlaceOption
                checked={placeKind === "outside"}
                onChange={() => setPlaceKind("outside")}
                title="Outside the church"
                hint="A home, hospital, or cemetery"
              />
            </div>
            <div className="mt-2.5">
              {placeKind === "parish" ? (
                <select
                  value={parishPlace}
                  onChange={(e) => setParishPlace(e.target.value)}
                  aria-label="Place in the parish"
                  className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
                >
                  {COMMON_LOCATIONS.map((place) => (
                    <option key={place} value={place}>
                      {place}
                    </option>
                  ))}
                </select>
              ) : (
                <AdminInput
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  aria-label="Address"
                  placeholder="Address, e.g. Cruz residence, 12 Gorordo Ave., Lahug"
                />
              )}
            </div>
          </fieldset>

          <AdminField label="Priest or staff" className="mb-0">
            <StaffSelect staff={staff} value={assignee} onChange={setAssignee} />
          </AdminField>

          {conflict && <ConflictNotice conflict={conflict} />}
          {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Add to schedule"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function PlaceOption({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
        checked ? "border-admin-green-700 bg-admin-green-050" : "border-admin-border hover:border-admin-border-strong"
      }`}
    >
      <input
        type="radio"
        name="event-place-kind"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-admin-green-700"
      />
      <span>
        <span className="block text-admin-body font-semibold text-admin-ink">{title}</span>
        <span className="block text-admin-support text-admin-ink-muted">{hint}</span>
      </span>
    </label>
  );
}
