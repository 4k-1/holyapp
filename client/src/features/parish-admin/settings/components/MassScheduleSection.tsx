// src/features/parish-admin/settings/components/MassScheduleSection.tsx
import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import {
  addRecurringCommitment,
  IntentionsAffectedError,
  listAssignableStaff,
  listRecurringCommitments,
  removeRecurringCommitment,
  updateRecurringCommitment,
  type AffectedMassTime,
  type IntentionMoves,
} from "@/features/parish-admin/schedule/api/scheduleApi";
import {
  convert24to12,
  dayAbbrev,
  parseTimeToMinutes,
  to24Hour,
  toISO,
} from "@/features/parish-admin/schedule/scheduleHelpers";
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

function movedText(count: number) {
  if (!count) return "";
  return ` ${count} booked ${count === 1 ? "intention" : "intentions"} moved to another Mass time.`;
}

/** "2030-03-02" → "Sat 2 Mar". */
function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function datesText(dates: string[]) {
  const shown = dates.slice(0, 4).map(shortDate).join(", ");
  return dates.length > 4 ? `${shown} and ${dates.length - 4} more` : shown;
}

type MassPattern = Pick<RecurringCommitment, "type" | "days" | "slots">;

/** Mass times on a date in a schedule. */
function massTimesOn(schedule: MassPattern[], date: string) {
  const day = dayAbbrev(date);
  const times = new Set<string>();
  for (const c of schedule) {
    if (c.type !== "mass" || !c.days.includes(day)) continue;
    for (const s of c.slots) times.add(s.start);
  }
  return [...times].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

const dayKey = (date: string, time: string) => `${date}|${time}`;

/** Every intention has a place: one choice for the whole time, or one for each day. */
const allChosen = (affected: AffectedMassTime[], moves: IntentionMoves) =>
  affected.every(
    (a) =>
      (a.options.length > 0 && Boolean(moves[a.time])) ||
      a.days.every((d) => {
        const to = moves[dayKey(d.date, a.time)] ?? "";
        return to !== "" && (!to.includes("|") || !to.endsWith("|"));
      })
  );

/** Another date and a Mass on it, for intentions on a day with no Mass left. */
function OtherDatePicker({
  value,
  schedule,
  label,
  onChange,
}: {
  value: string;
  schedule: MassPattern[];
  label: string;
  onChange: (next: string) => void;
}) {
  const [date, time] = value.includes("|") ? value.split("|") : ["", ""];
  const times = date ? massTimesOn(schedule, date) : [];
  return (
    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <AdminInput
        type="date"
        min={toISO(new Date())}
        value={date}
        onChange={(e) => onChange(`${e.target.value}|`)}
        aria-label={`Date to move the ${label} intentions to`}
      />
      <AdminSelect
        value={time}
        disabled={!date || times.length === 0}
        onChange={(e) => onChange(`${date}|${e.target.value}`)}
        aria-label={`Mass to move the ${label} intentions to`}
      >
        <option value="">{date && times.length === 0 ? "No Mass that day" : "Choose a Mass…"}</option>
        {times.map((t) => (
          <option key={t} value={t}>
            {t} Mass
          </option>
        ))}
      </AdminSelect>
    </div>
  );
}

const OTHER_DATE = "__other";

/**
 * For each removed time with intentions on it, choose another Mass that day. A day with no Mass left (or
 * when the office prefers) takes another date; the people who booked are told either way.
 */
function IntentionMovesFields({
  affected,
  moves,
  schedule,
  onChange,
}: {
  affected: AffectedMassTime[];
  moves: IntentionMoves;
  /** The Mass schedule once the change is saved. */
  schedule: MassPattern[];
  onChange: (next: IntentionMoves) => void;
}) {
  function setDay(time: string, date: string, to: string) {
    onChange({ ...moves, [dayKey(date, time)]: to });
  }

  return (
    <div className="space-y-3 rounded-lg border border-admin-border bg-admin-amber-100 px-4 py-3">
      <p className="text-admin-body font-semibold text-admin-ink">
        Intentions are booked on a Mass time you're removing. Choose where they go.
      </p>
      {affected.map((a) => (
        <div key={a.time}>
          <p className="text-admin-support text-admin-ink">
            <span className="font-semibold">{a.time}</span> · {a.count} {a.count === 1 ? "intention" : "intentions"} on{" "}
            {datesText(a.dates)}
          </p>
          {a.options.length > 0 ? (
            <AdminSelect
              value={moves[a.time] ?? ""}
              onChange={(e) => onChange({ ...moves, [a.time]: e.target.value })}
              aria-label={`Move the ${a.time} intentions to`}
              className="mt-1.5"
            >
              <option value="">Move them to…</option>
              {a.options.map((t) => (
                <option key={t} value={t}>
                  The {t} Mass that day
                </option>
              ))}
            </AdminSelect>
          ) : (
            <ul className="mt-1.5 space-y-2.5">
              {a.days.map((d) => {
                const value = moves[dayKey(d.date, a.time)] ?? "";
                const otherDate = value.includes("|") || d.options.length === 0;
                return (
                  <li key={d.date} className="rounded-md bg-admin-surface px-3 py-2">
                    <p className="text-admin-support text-admin-ink">
                      {shortDate(d.date)} · {d.count} {d.count === 1 ? "intention" : "intentions"}
                      {d.options.length === 0 && (
                        <span className="text-admin-ink-muted"> · no other Mass that day, choose another date</span>
                      )}
                    </p>
                    {d.options.length > 0 && (
                      <AdminSelect
                        value={otherDate ? OTHER_DATE : value}
                        onChange={(e) => setDay(a.time, d.date, e.target.value === OTHER_DATE ? "|" : e.target.value)}
                        aria-label={`Move the ${shortDate(d.date)} ${a.time} intentions to`}
                        className="mt-1.5"
                      >
                        <option value="">Move them to…</option>
                        {d.options.map((t) => (
                          <option key={t} value={t}>
                            The {t} Mass that day
                          </option>
                        ))}
                        <option value={OTHER_DATE}>Another date…</option>
                      </AdminSelect>
                    )}
                    {otherDate && (
                      <OtherDatePicker
                        value={value === "|" ? "" : value}
                        schedule={schedule}
                        label={`${shortDate(d.date)} ${a.time}`}
                        onChange={(to) => setDay(a.time, d.date, to)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
      <p className="text-admin-label text-admin-ink-muted">The people who booked them are told in the app.</p>
    </div>
  );
}

/** Removing a whole Mass that still has intentions booked on it. */
function RemoveMassModal({
  rc,
  affected,
  schedule,
  onClose,
  onRemoved,
}: {
  rc: RecurringCommitment;
  affected: AffectedMassTime[];
  /** The Mass schedule without this Mass. */
  schedule: MassPattern[];
  onClose: () => void;
  onRemoved: (moved: number) => void;
}) {
  const [moves, setMoves] = useState<IntentionMoves>({});
  const [current, setCurrent] = useState(affected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setSaving(true);
    setError("");
    try {
      onRemoved(await removeRecurringCommitment(rc.id, moves));
    } catch (err) {
      if (err instanceof IntentionsAffectedError) setCurrent(err.affected);
      setError(err instanceof Error ? err.message : "Could not remove this Mass.");
      setSaving(false);
    }
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={saving}
      panelClassName="max-w-[480px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="border-b border-admin-border px-6 py-4">
        <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Remove {rc.label}?</h3>
        <p className="mt-0.5 text-admin-support text-admin-ink-muted">
          {daysText(rc.days)}, {timesText(rc)} will no longer be on the Mass schedule.
        </p>
      </div>
      <div className="space-y-3 px-6 py-5">
        <IntentionMovesFields affected={current} moves={moves} schedule={schedule} onChange={setMoves} />
        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      </div>
      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" onClick={remove} disabled={saving || !allChosen(current, moves)}>
          {saving ? "Removing…" : "Move intentions and remove"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}

export function MassScheduleSection() {
  const { data: commitments = [], loading, error, refetch } = useAsync(() => listRecurringCommitments(), []);
  const masses = commitments.filter((rc) => rc.type === "mass");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState<{ rc: RecurringCommitment; affected: AffectedMassTime[] } | null>(null);

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
      if (err instanceof IntentionsAffectedError) setRemoving({ rc, affected: err.affected });
      else notifyError(err, "Could not remove this Mass.");
    }
  }

  function handleSaved(label: string, moved = 0) {
    setEditingId(null);
    setNotice(`${label} saved.${movedText(moved)}`);
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
              <MassScheduleForm
                key={rc.id}
                initial={rc}
                others={commitments.filter((c) => c.id !== rc.id)}
                onCancel={() => setEditingId(null)}
                onSaved={handleSaved}
              />
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

          {editingId === "new" && (
            <MassScheduleForm others={commitments} onCancel={() => setEditingId(null)} onSaved={handleSaved} />
          )}
        </div>
      )}
      {removing && (
        <RemoveMassModal
          rc={removing.rc}
          affected={removing.affected}
          schedule={commitments.filter((c) => c.id !== removing.rc.id)}
          onClose={() => setRemoving(null)}
          onRemoved={(moved) => {
            setNotice(`${removing.rc.label} removed.${moved ? ` ${moved} booked intentions moved.` : ""}`);
            setRemoving(null);
            refetch();
          }}
        />
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
  others,
  onCancel,
  onSaved,
}: {
  initial?: RecurringCommitment;
  /** The rest of the parish's regular schedule, for moving intentions to another date. */
  others: RecurringCommitment[];
  onCancel: () => void;
  onSaved: (label: string, moved?: number) => void;
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
  // Removed times that still have intentions booked, and where staff chose to move them.
  const [affected, setAffected] = useState<AffectedMassTime[]>([]);
  const [chosenMoves, setChosenMoves] = useState<IntentionMoves>({});

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
    // A time that was changed carries its intentions to the new time on its own.
    const autoMoves: IntentionMoves = {};
    initial?.slots.forEach((slot, i) => {
      const next = times[i]?.start ? convert24to12(times[i].start) : "";
      if (next && next !== slot.start) autoMoves[slot.start] = next;
    });
    try {
      let moved = 0;
      if (initial) moved = await updateRecurringCommitment(initial.id, payload, { ...autoMoves, ...chosenMoves });
      else await addRecurringCommitment(payload);
      onSaved(name, moved);
    } catch (err) {
      if (err instanceof IntentionsAffectedError) {
        setAffected(err.affected);
        setError("");
      } else {
        setError(err instanceof Error ? err.message : "Could not save these Mass times.");
      }
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

        {affected.length > 0 && (
          <IntentionMovesFields
            affected={affected}
            moves={chosenMoves}
            schedule={[
              ...others,
              {
                type: "mass",
                days,
                slots: times.filter((t) => t.start).map((t) => ({ start: convert24to12(t.start), end: "" })),
              },
            ]}
            onChange={setChosenMoves}
          />
        )}

        {error && (
          <p className="text-admin-body font-semibold text-admin-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={saving || (affected.length > 0 && !allChosen(affected, chosenMoves))}>
            {saving ? "Saving…" : affected.length > 0 ? "Move intentions and save" : "Save"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
