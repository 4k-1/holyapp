// src/features/parish-admin/schedule/components/AssignBlockModal.tsx
import { useEffect, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { listAssignableStaff, reassignOccurrence } from "../api/scheduleApi";
import type { ScheduleOccurrence } from "../types";

interface AssignBlockModalProps {
  occurrence: ScheduleOccurrence;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignBlockModal({ occurrence, onClose, onAssigned }: AssignBlockModalProps) {
  const [staff, setStaff] = useState<string[]>([]);
  const [selected, setSelected] = useState(occurrence.assignee || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listAssignableStaff().then(setStaff);
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await reassignOccurrence(occurrence.id, selected);
      onAssigned();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[380px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">{occurrence.assignee ? "Reassign" : "Assign"}</h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            {occurrence.title} · {occurrence.start}–{occurrence.end}
          </p>
        </div>

        <div className="px-6 py-5">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {occurrence.isRecurringOccurrence && (
            <p className="mt-2 text-admin-label text-admin-ink-faint">
              This only reassigns this single occurrence — the recurring schedule itself won't change.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}