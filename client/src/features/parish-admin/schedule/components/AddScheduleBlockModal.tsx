// src/features/parish-admin/schedule/components/AddScheduleBlockModal.tsx
import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { addScheduleBlock, checkConflict, listAssignableStaff } from "../api/scheduleApi";
import { convert24to12 } from "../scheduleHelpers";
import { COMMON_LOCATIONS, EVENT_TYPE_LABELS } from "../types";
import type { AssignableStaff, ScheduleConflict, ScheduleEventType } from "../types";
import { ConflictNotice } from "./ConflictNotice";
import { StaffSelect } from "./StaffSelect";

interface AddScheduleBlockModalProps {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddScheduleBlockModal({ defaultDate, onClose, onCreated }: AddScheduleBlockModalProps) {
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [type, setType] = useState<ScheduleEventType>("manual");
  const [location, setLocation] = useState("Main church");
  const [assignee, setAssignee] = useState("");
  const [conflict, setConflict] = useState<ScheduleConflict | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listAssignableStaff().then(setStaff);
  }, []);

  // Events may overlap in time, just not in the same place or with the same priest.
  useEffect(() => {
    if (!date || !start || !end || start >= end) return;
    const t = setTimeout(async () => {
      const result = await checkConflict(date, convert24to12(start), convert24to12(end), {
        assignee: assignee || undefined,
        location: location.trim() || undefined,
      });
      setConflict(result);
    }, 250);
    return () => clearTimeout(t);
  }, [date, start, end, assignee, location]);

  const timeInvalid = Boolean(start && end && start >= end);
  const canSubmit = Boolean(title.trim() && date && location.trim() && !timeInvalid && !conflict);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await addScheduleBlock({
        title: title.trim(),
        date,
        start: convert24to12(start),
        end: convert24to12(end),
        type,
        source: "manual",
        assignee,
        location: location.trim(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this to the schedule.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[520px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Add to schedule</h3>
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

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <AdminField label="Type" className="mb-0">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ScheduleEventType)}
                className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Place" className="mb-0">
              <AdminInput
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                list="schedule-locations"
                placeholder="e.g. Cruz residence, Brgy. Lahug"
              />
              <datalist id="schedule-locations">
                {COMMON_LOCATIONS.map((place) => (
                  <option key={place} value={place} />
                ))}
              </datalist>
            </AdminField>
          </div>

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
            {submitting ? "Adding…" : "Add to schedule"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
