// src/features/parish-admin/schedule/components/AddScheduleBlockModal.tsx
import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { addScheduleBlock, checkConflict, listAssignableStaff } from "../api/scheduleApi";
import { convert24to12, to24Hour } from "../scheduleHelpers";
import { EVENT_TYPE_LABELS } from "../types";
import type { ScheduleEventType, ScheduleOccurrence } from "../types";

interface AddScheduleBlockModalProps {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddScheduleBlockModal({ defaultDate, onClose, onCreated }: AddScheduleBlockModalProps) {
  const [staff, setStaff] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [type, setType] = useState<ScheduleEventType>("manual");
  const [assignee, setAssignee] = useState("");
  const [conflict, setConflict] = useState<ScheduleOccurrence | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listAssignableStaff().then(setStaff);
  }, []);

  useEffect(() => {
    if (!date || !start || !end) return;
    const t = setTimeout(async () => {
      const result = await checkConflict(date, convert24to12(start), convert24to12(end), { assignee: assignee || undefined });
      setConflict(result);
    }, 200);
    return () => clearTimeout(t);
  }, [date, start, end, assignee]);

  async function handleSubmit() {
    if (!title.trim() || !date) return;
    setSubmitting(true);
    try {
      await addScheduleBlock({
        title: title.trim(),
        date,
        start: convert24to12(start),
        end: convert24to12(end),
        type,
        source: "manual",
        assignee,
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[480px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-admin-ink">Add to schedule</h3>
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

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <AdminField label="Type" className="mb-0">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ScheduleEventType)}
                className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-[13.5px] text-admin-ink"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Assign to" className="mb-0">
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-[13.5px] text-admin-ink"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>

          {conflict && (
            <div className="rounded-[10px] border border-admin-gold-700/30 bg-admin-gold-700/10 px-3.5 py-3 text-[12.5px] text-admin-gold-700">
              {conflict.assignee ? `${conflict.assignee} already has` : "There's already"}{" "}
              <span className="font-semibold">{conflict.title}</span> at {conflict.start}–{conflict.end} on this
              date.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSubmit} disabled={!title.trim() || !date || submitting}>
            {submitting ? "Adding…" : conflict ? "Add anyway" : "Add block"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}