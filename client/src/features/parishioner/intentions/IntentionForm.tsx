import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { listMassSchedule, listMassTimesForDate } from "@/features/parishioner/intentions/api/massScheduleApi";
import { useAsync } from "@/hooks/useAsync";
import { getAvailableTimes, getScheduleLabel } from "@/features/parishioner/intentions/massScheduleUtils";
import { submitMassIntention } from "@/features/parishioner/intentions/intentionsApi";
import { MASS_INTENTION_TYPES, type Parish } from "@/types";

interface IntentionFormProps {
  parish: Parish;
  requesterId: string | null;
  defaultRequestedBy?: string;
  onSubmitted?: () => void;
}

export function IntentionForm({ parish, requesterId, defaultRequestedBy = "", onSubmitted }: IntentionFormProps) {
  const [intentionType, setIntentionType] = useState<string>(MASS_INTENTION_TYPES[0]);
  const [massDate, setMassDate] = useState("");
  const [massTime, setMassTime] = useState("");
  const [intentionFor, setIntentionFor] = useState("");
  const [requestedBy, setRequestedBy] = useState(defaultRequestedBy);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: massSchedule = [] } = useAsync(() => listMassSchedule(), []);
  const { data: dateTimes } = useAsync(
    () => (massDate ? listMassTimesForDate(massDate) : Promise.resolve({ times: [], label: "" })),
    [massDate]
  );
  const availableTimes = dateTimes?.times?.length ? dateTimes.times : getAvailableTimes(massDate, massSchedule);
  const scheduleLabel = dateTimes?.label || getScheduleLabel(massDate, massSchedule);
  const canSubmit = Boolean(massDate && massTime && intentionFor.trim());

  function handleDateChange(value: string) {
    setMassDate(value);
    setMassTime("");
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await submitMassIntention({
        parishId: parish.id,
        requesterId,
        intentionType,
        intentionFor,
        requestedBy: requestedBy || "Anonymous",
        scheduleDate: massDate,
        scheduleTime: massTime,
        scheduleLabel,
      });
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit this intention.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">Intention type</label>
          <select value={intentionType} onChange={(e) => setIntentionType(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/25">
            {MASS_INTENTION_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">Preferred Mass date</label>
          <input type="date" value={massDate} onChange={(e) => handleDateChange(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/25" />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">Mass time</label>
        {!massDate ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-alt px-3.5 py-3 text-xs text-ink-muted">
            Choose a date first — available times depend on the day of the week.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {availableTimes.map((time) => (
                <button key={time} type="button" onClick={() => setMassTime(time)} className={`rounded-lg border-2 py-2.5 text-xs font-bold transition-all ${massTime === time ? "border-accent bg-accent/10 text-ink shadow-sm" : "border-border bg-surface text-ink-muted hover:border-accent/40 hover:bg-surface-alt/50"}`}>
                  {time}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">{scheduleLabel} schedule</p>
          </>
        )}
      </div>

      <div className="mt-4">
        <Input label="Intention for" placeholder="e.g. The Santos Family" value={intentionFor} onChange={(e) => setIntentionFor(e.target.value)} />
      </div>

      <div className="mt-4">
        <Input label="Requested by" placeholder="Your full name" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Submitting..." : "Submit Intention"}
        </Button>
      </div>
    </div>
  );
}