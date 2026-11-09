// src/features/parish-admin/schedule/components/AssignBlockModal.tsx
import { useEffect, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { checkConflict, listAssignableStaff, reassignOccurrence } from "../api/scheduleApi";
import {
  assigneeValueOf,
  sameAssignee,
  type AssignableStaff,
  type ScheduleConflict,
  type ScheduleOccurrence,
} from "../types";
import { ConflictNotice } from "./ConflictNotice";
import { StaffSelect } from "./StaffSelect";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";

interface AssignBlockModalProps {
  occurrence: ScheduleOccurrence;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignBlockModal({ occurrence, onClose, onAssigned }: AssignBlockModalProps) {
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [selected, setSelected] = useState(assigneeValueOf(occurrence));
  const current = assigneeValueOf(occurrence);
  const chosen = Boolean(selected.assigneeId || selected.assignee.trim());
  const changed = !sameAssignee(selected, current);
  const [conflict, setConflict] = useState<ScheduleConflict | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listAssignableStaff().then(setStaff);
  }, []);

  // Only the person matters here: the event's time and place are already set.
  useEffect(() => {
    if (!chosen || !changed) return;
    let cancelled = false;
    const t = setTimeout(() => {
      checkConflict(occurrence.date, occurrence.start, occurrence.end, {
        assigneeId: selected.assigneeId,
        assignee: selected.assignee,
        excludeId: occurrence.id,
      }).then((result) => {
        if (!cancelled) setConflict(result);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [selected, chosen, changed, occurrence]);

  const shownConflict = chosen && changed ? conflict : undefined;

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      await reassignOccurrence(occurrence.id, selected);
      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this assignment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={submitting}
      panelClassName="max-w-[420px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="border-b border-admin-border px-6 py-4">
        <h3 className="font-serif text-admin-section font-semibold text-admin-ink">{occurrence.assignee ? "Reassign" : "Assign"}</h3>
        <p className="mt-0.5 text-admin-support text-admin-ink-muted">
          {occurrence.title} · {occurrence.start}–{occurrence.end}
          {occurrence.location ? ` · ${occurrence.location}` : ""}
        </p>
      </div>

      <div className="space-y-3 px-6 py-5">
        <StaffSelect staff={staff} value={selected} onChange={setSelected} />
        {shownConflict && <ConflictNotice conflict={shownConflict} />}
        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
        {occurrence.isRecurringOccurrence && (
          <p className="text-admin-label text-admin-ink-faint">
            This only reassigns this single occurrence — the recurring schedule itself won't change.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </AdminButton>
        <AdminButton onClick={handleSubmit} disabled={submitting || Boolean(shownConflict)}>
          {submitting ? "Saving…" : "Save"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
