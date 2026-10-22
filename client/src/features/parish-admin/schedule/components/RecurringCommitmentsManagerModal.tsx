// src/features/parish-admin/schedule/components/RecurringCommitmentsManagerModal.tsx
import { useCallback, useEffect, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import {
  addRecurringCommitment,
  listAssignableStaff,
  listRecurringCommitments,
  removeRecurringCommitment,
  updateRecurringCommitment,
} from "../api/scheduleApi";
import { convert24to12, to24Hour } from "../scheduleHelpers";
import { EVENT_TYPE_LABELS } from "../types";
import type { DayAbbrev, RecurringCommitment, ScheduleEventType } from "../types";

const DAYS: DayAbbrev[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface RecurringCommitmentsManagerModalProps {
  onClose: () => void;
  onChanged: () => void;
}

export function RecurringCommitmentsManagerModal({ onClose, onChanged }: RecurringCommitmentsManagerModalProps) {
  const [items, setItems] = useState<RecurringCommitment[]>([]);
  const [staff, setStaff] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const fetchCommitments = useCallback(
    () =>
      Promise.all([listRecurringCommitments(), listAssignableStaff()]).then(([rcs, staffList]) => {
        // Regular Masses are edited in Settings → Mass Schedule.
        setItems(rcs.filter((rc) => rc.type !== "mass"));
        setStaff(staffList);
        setLoading(false);
      }),
    []
  );

  function reload() {
    setLoading(true);
    return fetchCommitments();
  }

  useEffect(() => {
    fetchCommitments();
  }, [fetchCommitments]);

  async function handleRemove(id: string, label: string) {
    if (!window.confirm(`Remove "${label}" from the recurring schedule? This only stops future occurrences — past records are untouched.`)) return;
    await removeRecurringCommitment(id);
    await reload();
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
          <div>
            <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Recurring schedule</h3>
            <p className="mt-0.5 text-admin-support text-admin-ink-muted">
              Novenas, devotions, and anything else that repeats weekly. Regular Mass times are set in Settings → Mass Schedule.
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-admin-body text-admin-ink-muted">Loading…</p>
          ) : (
            <div className="space-y-2.5">
              {items.map((rc) =>
                editingId === rc.id ? (
                  <RecurringCommitmentForm
                    key={rc.id}
                    staff={staff}
                    initial={rc}
                    onCancel={() => setEditingId(null)}
                    onSaved={async () => {
                      setEditingId(null);
                      await reload();
                      onChanged();
                    }}
                  />
                ) : (
                  <div key={rc.id} className="rounded-[10px] border border-admin-border bg-admin-surface-alt p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-serif text-admin-body font-semibold text-admin-ink">{rc.label}</p>
                          <AdminBadge tone="green">{EVENT_TYPE_LABELS[rc.type]}</AdminBadge>
                        </div>
                        <p className="mt-1 text-admin-support text-admin-ink-muted">
                          {rc.days.join(", ")} ·{" "}
                          {rc.slots.map((s) => `${s.start} – ${s.end}`).join(", ")}
                        </p>
                        <p className="mt-0.5 text-admin-support text-admin-ink-faint">{rc.assignee || "Unassigned"}</p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => setEditingId(rc.id)}
                          className="rounded-md border border-admin-border px-2.5 py-1 text-admin-label font-semibold text-admin-ink-muted hover:bg-admin-surface"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemove(rc.id, rc.label)}
                          className="rounded-md border border-admin-border px-2.5 py-1 text-admin-label font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {editingId === "new" ? (
                <RecurringCommitmentForm
                  staff={staff}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await reload();
                    onChanged();
                  }}
                />
              ) : (
                <button
                  onClick={() => setEditingId("new")}
                  className="w-full rounded-[10px] border border-dashed border-admin-border-strong py-3 text-admin-body font-semibold text-admin-ink-muted hover:border-admin-green-600 hover:bg-admin-green-050 hover:text-admin-green-800"
                >
                  + Add recurring commitment
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose}>
            Done
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function RecurringCommitmentForm({
  staff,
  initial,
  onCancel,
  onSaved,
}: {
  staff: string[];
  initial?: RecurringCommitment;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [type, setType] = useState<ScheduleEventType>(initial?.type ?? "novena");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const [days, setDays] = useState<DayAbbrev[]>(initial?.days ?? []);
  const [slots24, setSlots24] = useState<{ start: string; end: string }[]>(
    initial?.slots.map((s) => ({ start: to24Hour(s.start), end: to24Hour(s.end) })) ?? [
      { start: "06:00", end: "07:00" },
    ]
  );
  const [showOnOverview, setShowOnOverview] = useState(initial?.showOnOverview !== false);
  const [saving, setSaving] = useState(false);

  function toggleDay(d: DayAbbrev) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function addSlot() {
    setSlots24((prev) => [...prev, { start: "06:00", end: "07:00" }]);
  }

  function removeSlot(idx: number) {
    setSlots24((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSlot(idx: number, patch: Partial<{ start: string; end: string }>) {
    setSlots24((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  const slotsValid =
    slots24.length > 0 &&
    slots24.every((s) => s.start && s.end && s.start < s.end);

  async function handleSave() {
    if (!label.trim() || days.length === 0 || !slotsValid) return;
    setSaving(true);
    try {
      const payload = {
        label: label.trim(),
        type,
        assignee,
        days,
        slots: slots24.map((s) => ({
          start: convert24to12(s.start),
          end: convert24to12(s.end),
        })),
        showOnOverview,
      };
      if (initial) {
        await updateRecurringCommitment(initial.id, payload);
      } else {
        await addRecurringCommitment(payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-admin-green-700/40 bg-admin-green-050 p-4">
      <AdminField label="Label" className="mb-3">
        <AdminInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Wednesday Novena" />
      </AdminField>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <AdminField label="Type" className="mb-0">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ScheduleEventType)}
            className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
          >
            {Object.entries(EVENT_TYPE_LABELS)
              .filter(([val]) => val !== "mass")
              .map(([val, l]) => (
              <option key={val} value={val}>
                {l}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Assign to" className="mb-0">
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
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

      <div className="mb-3">
        <p className="mb-1.5 text-admin-label font-semibold uppercase tracking-wide text-admin-ink-muted">Days</p>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`rounded-full border px-3 py-1 text-admin-support font-semibold transition ${
                days.includes(d)
                  ? "border-admin-green-700 bg-admin-green-700 text-white"
                  : "border-admin-border bg-admin-surface text-admin-ink-muted"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <p className="mb-1.5 text-admin-label font-semibold uppercase tracking-wide text-admin-ink-muted">
          Time slots
        </p>
        <div className="space-y-1.5">
          {slots24.map((slot, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={slot.start}
                onChange={(e) => updateSlot(i, { start: e.target.value })}
                aria-label={`Slot ${i + 1} start`}
                className="rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-admin-body text-admin-ink"
              />
              <span className="text-admin-support text-admin-ink-muted">to</span>
              <input
                type="time"
                value={slot.end}
                onChange={(e) => updateSlot(i, { end: e.target.value })}
                aria-label={`Slot ${i + 1} end`}
                className="rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-admin-body text-admin-ink"
              />
              {slots24.length > 1 && (
                <button type="button" onClick={() => removeSlot(i)} className="text-admin-support font-semibold text-red-700">
                  Remove
                </button>
              )}
            </div>
          ))}
          {!slotsValid && (
            <p className="text-admin-support text-admin-red-700">Each slot needs an end time after its start.</p>
          )}
          <button type="button" onClick={addSlot} className="text-admin-support font-semibold text-admin-green-700 hover:underline">
            + Add another slot
          </button>
        </div>
      </div>

      <label className="mb-4 flex cursor-pointer items-center gap-2 text-admin-support text-admin-ink">
        <input
          type="checkbox"
          checked={showOnOverview}
          onChange={(e) => setShowOnOverview(e.target.checked)}
          className="h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
        />
        Show on month calendar dots
      </label>

      <div className="flex justify-end gap-2">
        <AdminButton variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton size="sm" onClick={handleSave} disabled={!label.trim() || days.length === 0 || !slotsValid || saving}>
          {saving ? "Saving…" : initial ? "Save changes" : "Add commitment"}
        </AdminButton>
      </div>
    </div>
  );
}