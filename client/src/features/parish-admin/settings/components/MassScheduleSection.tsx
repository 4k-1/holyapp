// src/features/parish-admin/settings/components/MassScheduleSection.tsx
import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import {
  addRecurringCommitment,
  listAssignableStaff,
  listRecurringCommitments,
  removeRecurringCommitment,
  updateRecurringCommitment,
} from "@/features/parish-admin/schedule/api/scheduleApi";
import { convert24to12, parseTimeToMinutes, to24Hour } from "@/features/parish-admin/schedule/scheduleHelpers";
import { AssigneeName, StaffSelect } from "@/features/parish-admin/schedule/components/StaffSelect";
import {
  assigneeValueOf,
  type AssignableStaff,
  type AssigneeValue,
  type DayAbbrev,
  type RecurringCommitment,
} from "@/features/parish-admin/schedule/types";
import { useAsync } from "@/hooks/useAsync";
import { askConfirm, notifyError } from "@/lib/notify";
import { SettingsPanel, SettingsPillButton } from "./SettingsUI";

const DAYS: { key: DayAbbrev; label: string }[] = [
  { key: "Sun", label: "Sunday" },
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Fri", label: "Friday" },
  { key: "Sat", label: "Saturday" },
];

/** New Mass times block the church for an hour unless an existing time already had another length. */
const DEFAULT_MASS_MINUTES = 60;

function addMinutes24(time24: string, minutes: number) {
  const [h, m] = time24.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function daysText(days: DayAbbrev[]) {
  const order = DAYS.map((d) => d.key);
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const weekdays: DayAbbrev[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  if (sorted.length === 5 && weekdays.every((d) => sorted.includes(d))) return "Monday to Friday";
  if (sorted.length === 7) return "Every day";
  return sorted.map((d) => DAYS.find((x) => x.key === d)?.label ?? d).join(", ");
}

function timesText(rc: RecurringCommitment) {
  return [...rc.slots]
    .sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start))
    .map((s) => s.start)
    .join(" · ");
}

export function MassScheduleSection() {
  const { data: commitments = [], loading, error, refetch } = useAsync(() => listRecurringCommitments(), []);
  const masses = commitments.filter((rc) => rc.type === "mass");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState("");

  async function handleRemove(rc: RecurringCommitment) {
    if (
      !(await askConfirm({
        title: `Remove ${rc.label}?`,
        message: `${daysText(rc.days)}, ${timesText(rc)} will no longer be on the Mass schedule.`,
        confirmLabel: "Remove",
        danger: true,
      }))
    )
      return;
    try {
      await removeRecurringCommitment(rc.id);
      setNotice(`${rc.label} removed.`);
      refetch();
    } catch (err) {
      notifyError(err, "Could not remove this Mass.");
    }
  }

  function handleSaved(label: string) {
    setEditingId(null);
    setNotice(`${label} saved.`);
    refetch();
  }

  return (
    <SettingsPanel
      title="Regular Masses"
      description="These aren't listed as events on the Schedule page."
      action={
        editingId !== "new" &&
        !loading &&
        !error && (
          <AdminButton size="sm" className="rounded-full" onClick={() => setEditingId("new")}>
            + Add Mass times
          </AdminButton>
        )
      }
    >
      {notice && (
        <p className="mb-4 rounded-lg bg-admin-green-100 px-3.5 py-2.5 text-admin-body font-semibold text-admin-green-900" role="status">
          {notice}
        </p>
      )}

      {loading && masses.length === 0 ? (
        <p className="text-admin-body text-admin-ink-muted">Loading the Mass schedule…</p>
      ) : error ? (
        <p className="text-admin-body font-semibold text-admin-red-700" role="alert">
          {error.message}
        </p>
      ) : (
        <div className="space-y-3">
          {masses.map((rc) =>
            editingId === rc.id ? (
              <MassScheduleForm key={rc.id} initial={rc} onCancel={() => setEditingId(null)} onSaved={handleSaved} />
            ) : (
              <div
                key={rc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-admin-border px-4 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-admin-green-100 text-admin-green-700">
                    <ClockIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-admin-body font-semibold text-admin-ink">{rc.label}</p>
                    <p className="mt-0.5 text-admin-support text-admin-ink-muted">
                      {daysText(rc.days)} ·{" "}
                      <span className="font-semibold tabular-nums text-admin-green-800">{timesText(rc)}</span>
                      {rc.assignee && (
                        <>
                          {" "}· <AssigneeName name={rc.assignee} guest={rc.guest} />
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <SettingsPillButton onClick={() => setEditingId(rc.id)} disabled={editingId !== null}>
                    Edit
                  </SettingsPillButton>
                  <SettingsPillButton
                    icon={null}
                    onClick={() => handleRemove(rc)}
                    className="hover:!border-admin-red-700 hover:!text-admin-red-700"
                  >
                    Remove
                  </SettingsPillButton>
                </div>
              </div>
            )
          )}

          {masses.length === 0 && editingId !== "new" && (
            <p className="rounded-xl border border-dashed border-admin-border-strong px-4 py-6 text-center text-admin-body text-admin-ink-muted">
              No regular Masses yet. Use Add Mass times to set the first one.
            </p>
          )}

          {editingId === "new" && <MassScheduleForm onCancel={() => setEditingId(null)} onSaved={handleSaved} />}
        </div>
      )}
    </SettingsPanel>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MassScheduleForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: RecurringCommitment;
  onCancel: () => void;
  onSaved: (label: string) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [days, setDays] = useState<DayAbbrev[]>(initial?.days ?? []);
  const [times, setTimes] = useState<{ start: string; minutes: number }[]>(
    initial?.slots.map((s) => ({
      start: to24Hour(s.start),
      minutes: Math.max(15, parseTimeToMinutes(s.end) - parseTimeToMinutes(s.start)) || DEFAULT_MASS_MINUTES,
    })) ?? [{ start: "06:00", minutes: DEFAULT_MASS_MINUTES }]
  );
  const [celebrant, setCelebrant] = useState<AssigneeValue>(assigneeValueOf(initial));
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listAssignableStaff().then(setStaff).catch(() => setStaff([]));
  }, []);

  function toggleDay(day: DayAbbrev) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSave() {
    const name = label.trim();
    if (!name) return setError("Give these Masses a name, like “Sunday Mass”.");
    if (days.length === 0) return setError("Choose at least one day.");
    if (times.length === 0 || times.some((t) => !t.start)) return setError("Enter a time for every Mass.");
    setError("");
    setSaving(true);
    const payload = {
      label: name,
      type: "mass" as const,
      days,
      slots: times.map((t) => ({ start: convert24to12(t.start), end: convert24to12(addMinutes24(t.start, t.minutes)) })),
      assigneeId: celebrant.assigneeId,
      assignee: celebrant.assigneeId ? "" : celebrant.assignee.trim(),
      showOnOverview: false,
    };
    try {
      if (initial) await updateRecurringCommitment(initial.id, payload);
      else await addRecurringCommitment(payload);
      onSaved(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save these Mass times.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-admin-green-600 bg-admin-green-050 px-4 py-4">
      <div className="space-y-4">
        <AdminField label="Name">
          <AdminInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Sunday Mass" />
        </AdminField>

        <fieldset>
          <legend className="mb-2 text-admin-body font-semibold text-admin-ink">Days</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = days.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d.key)}
                  className={`min-h-[44px] rounded-lg border px-3.5 text-admin-body font-semibold transition ${
                    on
                      ? "border-admin-green-700 bg-admin-green-700 text-white"
                      : "border-admin-border-strong bg-admin-surface text-admin-ink hover:border-admin-green-600"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-admin-body font-semibold text-admin-ink">Mass times</legend>
          <div className="space-y-2">
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <AdminInput
                  type="time"
                  value={t.start}
                  aria-label={`Mass time ${i + 1}`}
                  onChange={(e) => setTimes((prev) => prev.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                  className="!w-auto"
                />
                {times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTimes((prev) => prev.filter((_, j) => j !== i))}
                    className="min-h-[44px] px-2 text-admin-body font-semibold text-admin-red-700 hover:underline"
                  >
                    Remove this time
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTimes((prev) => [...prev, { start: "", minutes: DEFAULT_MASS_MINUTES }])}
            className="mt-2 min-h-[44px] text-admin-body font-semibold text-admin-green-700 hover:underline"
          >
            + Add another time
          </button>
        </fieldset>

        <AdminField label="Usually said by (optional)">
          <StaffSelect staff={staff} value={celebrant} onChange={setCelebrant} emptyLabel="Varies / not set" />
          <p className="mt-1 text-admin-support text-admin-ink-muted">
            You can still change the priest for a single Mass on the Schedule page.
          </p>
        </AdminField>

        {error && (
          <p className="text-admin-body font-semibold text-admin-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
