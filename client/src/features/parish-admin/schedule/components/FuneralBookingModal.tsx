// src/features/parish-admin/schedule/components/FuneralBookingModal.tsx
import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { notify } from "@/lib/notify";
import { bookFuneral, getFuneralSlots, getMassTimesOn, listAssignableStaff } from "../api/scheduleApi";
import type { FuneralDay } from "../api/scheduleApi";
import { liturgicalSummary } from "../calendarCheck";
import { eveningMass, FOLLOW_UPS, followUpDate, type FollowUpKey } from "../funeralFollowUps";
import { parseTimeToMinutes, toISO } from "../scheduleHelpers";
import { NOBODY, type AssignableStaff, type AssigneeValue } from "../types";
import { CalendarWarningNotice } from "./CalendarWarnings";
import { StaffSelect } from "./StaffSelect";

const TODAY = toISO(new Date());

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISO(d);
}

function dayHeading(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** What the office changed on a follow-up Mass; anything left out uses the usual date and the evening Mass. */
interface FollowUpChoice {
  on: boolean;
  date?: string;
  time?: string;
  offering: string;
}

interface FuneralBookingModalProps {
  onClose: () => void;
  onSaved: () => void;
}

/**
 * C7: book a funeral fast. Shows the free church hours for three days with the priests free at each, then the
 * Masses families expect afterwards (9th day, 40th day, first anniversary), booked as Mass intentions.
 */
export function FuneralBookingModal({ onClose, onSaved }: FuneralBookingModalProps) {
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [deceasedName, setDeceasedName] = useState("");
  const [dateOfDeath, setDateOfDeath] = useState(TODAY);
  const [requesterName, setRequesterName] = useState("");
  const [contact, setContact] = useState("");
  const [from, setFrom] = useState(tomorrow);
  const [days, setDays] = useState<FuneralDay[] | null>(null);
  const [chosen, setChosen] = useState<{ date: string; start: string; end: string } | null>(null);
  const [assignee, setAssignee] = useState<AssigneeValue>(NOBODY);
  const [bookAnywayKey, setBookAnywayKey] = useState("");
  const [choices, setChoices] = useState<Record<FollowUpKey, FollowUpChoice>>({
    ninth: { on: false, offering: "" },
    fortieth: { on: false, offering: "" },
    anniversary: { on: false, offering: "" },
  });
  const [massTimes, setMassTimes] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listAssignableStaff().then(setStaff);
  }, []);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return;
    let active = true;
    getFuneralSlots(from)
      .then((result) => {
        if (active) setDays(result);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Couldn't load open times.");
      });
    return () => {
      active = false;
    };
  }, [from]);

  const followUps = FOLLOW_UPS.map((item) => {
    const choice = choices[item.key];
    const date = choice.date ?? followUpDate(item.key, dateOfDeath);
    const times = [...(massTimes[date] ?? [])].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    const time = choice.time && times.includes(choice.time) ? choice.time : eveningMass(times);
    return { ...item, ...choice, date, times, time, loaded: date in massTimes };
  });

  // Load the Mass times for each follow-up date that is ticked.
  const neededDates = followUps.filter((f) => f.on && f.date && !f.loaded).map((f) => f.date);
  const neededKey = neededDates.join(",");
  useEffect(() => {
    if (!neededKey) return;
    for (const date of neededKey.split(",")) {
      getMassTimesOn(date)
        .then((times) => setMassTimes((prev) => ({ ...prev, [date]: times })))
        .catch(() => setMassTimes((prev) => ({ ...prev, [date]: [] })));
    }
  }, [neededKey]);

  const chosenDay = days?.find((d) => d.date === chosen?.date);
  const chosenSlot = chosenDay?.slots.find((s) => s.start === chosen?.start);
  const freePriests = staff.filter((person) => person.clergy && chosenSlot?.freePriests.includes(person.id));
  const warnings = chosenDay?.warnings ?? [];
  const needsBookAnyway = warnings.some((w) => w.level === "rule");
  const warningKey = `${chosen?.date}|${warnings.map((w) => w.message).join("|")}`;
  const bookAnyway = bookAnywayKey === warningKey;

  const ticked = followUps.filter((f) => f.on);
  const followUpProblem = ticked.find((f) => !f.date || f.date < TODAY || (f.loaded && !f.time));
  const canSave = Boolean(
    deceasedName.trim() &&
      chosen &&
      (!needsBookAnyway || bookAnyway) &&
      !followUpProblem &&
      ticked.every((f) => f.loaded) &&
      (ticked.length === 0 || requesterName.trim())
  );

  function setChoice(key: FollowUpKey, patch: Partial<FollowUpChoice>) {
    setChoices((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function chooseSlot(date: string, start: string, end: string, free: string[]) {
    setChosen({ date, start, end });
    if (assignee.assigneeId && !free.includes(assignee.assigneeId)) setAssignee(NOBODY);
  }

  async function handleSave() {
    if (!canSave || !chosen) return;
    setSaving(true);
    setError("");
    try {
      const result = await bookFuneral({
        deceasedName: deceasedName.trim(),
        date: chosen.date,
        start: chosen.start,
        end: chosen.end,
        assigneeId: assignee.assigneeId,
        assignee: assignee.assigneeId ? "" : assignee.assignee.trim(),
        requesterName: requesterName.trim(),
        contact: contact.trim(),
        calendarOk: needsBookAnyway && bookAnyway,
        followUps: ticked.map((f) => ({
          label: f.label,
          date: f.date,
          time: f.time,
          offering: f.offering ? Number(f.offering) : undefined,
        })),
      });
      const n = result.intentions.length;
      notify(n > 0 ? `Funeral booked, with ${n} ${n === 1 ? "Mass" : "Masses"} for the deceased.` : "Funeral booked.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't book this funeral.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={saving}
      panelClassName="max-w-[680px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
        <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Book a funeral</h3>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[minmax(0,1fr)_180px]">
          <AdminField label="Name of the deceased" className="mb-0">
            <AdminInput value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} placeholder="e.g. Juan Dela Cruz" />
          </AdminField>
          <AdminField label="Date of death" className="mb-0">
            <AdminInput type="date" value={dateOfDeath} max={TODAY} onChange={(e) => setDateOfDeath(e.target.value)} />
          </AdminField>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <AdminField label="Family contact" className="mb-0">
            <AdminInput value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="e.g. Maria Dela Cruz" />
          </AdminField>
          <AdminField label="Phone number" className="mb-0">
            <AdminInput value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. 0917 123 4567" />
          </AdminField>
        </div>

        <section>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <p className="text-admin-label font-semibold text-admin-ink-muted">Free times in the main church</p>
            <label className="flex items-center gap-2 text-admin-support text-admin-ink-muted">
              From
              <AdminInput type="date" value={from} min={TODAY} onChange={(e) => setFrom(e.target.value)} className="w-auto py-1" />
            </label>
          </div>
          {!days ? (
            <p className="text-admin-support text-admin-ink-faint">Loading open times…</p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {days.map((day) => (
                <div key={day.date} className="rounded-lg border border-admin-border p-2.5">
                  <p className="text-admin-body font-semibold text-admin-ink">{dayHeading(day.date)}</p>
                  <p className="text-admin-label text-admin-ink-muted">{liturgicalSummary(day.day)}</p>
                  {day.warnings.some((w) => w.level === "rule") && (
                    <p className="mt-0.5 text-admin-label font-semibold text-admin-gold-700">No funeral Mass this day</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {day.slots.length === 0 && <span className="text-admin-label text-admin-ink-faint">No free time</span>}
                    {day.slots.map((slot) => {
                      const selected = chosen?.date === day.date && chosen.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          aria-pressed={selected}
                          title={`${slot.freePriests.length} ${slot.freePriests.length === 1 ? "priest" : "priests"} free`}
                          onClick={() => chooseSlot(day.date, slot.start, slot.end, slot.freePriests)}
                          className={`rounded-md border px-2 py-1 text-admin-label font-semibold tabular-nums ${
                            selected
                              ? "border-admin-green-700 bg-admin-green-700 text-white"
                              : slot.freePriests.length === 0
                                ? "border-admin-border text-admin-ink-faint"
                                : "border-admin-border text-admin-ink hover:border-admin-green-700"
                          }`}
                        >
                          {slot.start.replace(":00", "")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {chosen && (
          <AdminField label={`Priest (free on ${dayHeading(chosen.date)} at ${chosen.start})`} className="mb-0">
            <StaffSelect staff={freePriests} value={assignee} onChange={setAssignee} emptyLabel="Not assigned yet" />
            {freePriests.length === 0 && (
              <p className="mt-1 text-admin-support text-admin-ink-muted">
                No priest on the Personnel list is free then. Choose a visiting priest, or another time.
              </p>
            )}
          </AdminField>
        )}

        <CalendarWarningNotice
          warnings={warnings}
          bookAnyway={bookAnyway}
          onBookAnywayChange={(value) => setBookAnywayKey(value ? warningKey : "")}
        />

        <section>
          <p className="text-admin-label font-semibold text-admin-ink-muted">Masses for the deceased afterwards</p>
          <p className="mb-2 text-admin-support text-admin-ink-faint">
            Booked as Mass intentions on the regular Masses those days. Tick the ones the family wants.
          </p>
          <div className="space-y-2">
            {followUps.map((f) => (
              <div key={f.key} className="rounded-lg border border-admin-border px-3 py-2.5">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={f.on}
                    onChange={(e) => setChoice(f.key, { on: e.target.checked })}
                    className="h-4 w-4 accent-admin-green-700"
                  />
                  <span className="text-admin-body font-semibold text-admin-ink">{f.label}</span>
                  <span className="text-admin-support text-admin-ink-muted">{f.hint}</span>
                </label>
                {f.on && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <AdminInput
                      type="date"
                      value={f.date}
                      min={TODAY}
                      onChange={(e) => setChoice(f.key, { date: e.target.value })}
                      aria-label={`${f.label} date`}
                    />
                    <select
                      value={f.time}
                      onChange={(e) => setChoice(f.key, { time: e.target.value })}
                      aria-label={`${f.label} Mass time`}
                      disabled={!f.loaded || f.times.length === 0}
                      className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
                    >
                      {!f.loaded && <option value="">Loading…</option>}
                      {f.loaded && f.times.length === 0 && <option value="">No Mass that day</option>}
                      {f.times.map((t) => (
                        <option key={t} value={t}>
                          {t} Mass
                        </option>
                      ))}
                    </select>
                    <AdminInput
                      type="number"
                      min={0}
                      value={f.offering}
                      onChange={(e) => setChoice(f.key, { offering: e.target.value })}
                      placeholder="Offering (₱, optional)"
                      aria-label={`${f.label} offering`}
                    />
                    {f.date && f.date < TODAY && (
                      <p className="text-admin-support text-red-700 sm:col-span-3">This date has passed.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {ticked.length > 0 && !requesterName.trim() && (
            <p className="mt-2 text-admin-support text-admin-ink-muted">Enter the family contact to book these Masses.</p>
          )}
        </section>

        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton onClick={handleSave} disabled={!canSave || saving}>
          {saving ? "Booking…" : "Book funeral"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
