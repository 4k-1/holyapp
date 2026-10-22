import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  listOpenMassSlots,
  submitMassIntention,
  type OpenMassSlot,
} from "@/features/parishioner/intentions/intentionsApi";
import { useAsync } from "@/hooks/useAsync";
import { MASS_INTENTION_TYPES, type Parish } from "@/types";

interface IntentionFormProps {
  parish: Parish;
  defaultRequestedBy?: string;
  /** Called after a request without a donation; a donation continues to GCash instead. */
  onSubmitted?: () => void;
}

const QUICK_AMOUNTS = [50, 100, 200, 500];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const REASON_HINT: Record<string, string> = {
  Thanksgiving: "For blessings received",
  Healing: "For someone who is sick",
  "In memory of the deceased": "For the soul of a loved one",
  "Birthday blessing": "On a birthday",
  Other: "Any other intention",
};

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function formatLongDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function IntentionForm({ parish, defaultRequestedBy = "", onSubmitted }: IntentionFormProps) {
  const { data, loading, error: loadError } = useAsync(() => listOpenMassSlots(), [parish.id]);
  const slots = useMemo(() => data?.slots ?? [], [data]);
  const gcashDonations = data?.gcashDonations ?? false;

  const slotsByDate = useMemo(() => {
    const byDate = new Map<string, OpenMassSlot[]>();
    for (const slot of slots) byDate.set(slot.date, [...(byDate.get(slot.date) ?? []), slot]);
    return byDate;
  }, [slots]);
  const months = useMemo(() => [...new Set(slots.map((slot) => monthKey(slot.date)))].sort(), [slots]);

  const [monthIndex, setMonthIndex] = useState(0);
  const [massDate, setMassDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [intentionType, setIntentionType] = useState<string>(MASS_INTENTION_TYPES[0]);
  const [intentionFor, setIntentionFor] = useState("");
  const [requestedBy, setRequestedBy] = useState(defaultRequestedBy);
  const [donate, setDonate] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const daySlots = slotsByDate.get(massDate) ?? [];
  const slot = daySlots.find((item) => item.id === slotId) ?? null;
  const donation = donate ? Number(amount) : 0;
  const donationValid = !donate || (Number.isFinite(donation) && donation >= 1);
  const canSubmit = Boolean(slot && intentionFor.trim() && requestedBy.trim() && donationValid);

  function chooseDate(iso: string) {
    setMassDate(iso);
    setSlotId("");
  }

  async function handleSubmit() {
    if (!slot || !canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await submitMassIntention({
        parishId: parish.id,
        requesterId: null,
        intentionType,
        intentionFor: intentionFor.trim(),
        requestedBy: requestedBy.trim(),
        scheduleDate: slot.date,
        scheduleTime: slot.time,
        scheduleLabel: slot.scheduleLabel,
        donation: donate ? donation : 0,
      });
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit this intention.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && slots.length === 0) {
    return <FormCard><p className="text-sm text-ink-muted">Loading the Mass schedule…</p></FormCard>;
  }
  if (loadError) {
    return (
      <FormCard>
        <p className="text-sm text-red-700" role="alert">
          {loadError.message}
        </p>
      </FormCard>
    );
  }
  if (slots.length === 0) {
    return (
      <FormCard>
        <p className="font-semibold text-ink">No open Masses right now</p>
        <p className="mt-1 text-sm text-ink-muted">
          Every Mass in the next two months is already full. Please contact the parish office.
        </p>
      </FormCard>
    );
  }

  const month = months[Math.min(monthIndex, months.length - 1)];
  const [year, monthNum] = month.split("-").map(Number);
  const firstDow = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <FormCard>
      <Section step={1} title="Choose a Mass date" hint="Only dates with room for another intention can be chosen.">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
            disabled={monthIndex === 0}
            aria-label="Previous month"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-ink-muted hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
          >
            <Chevron direction="left" />
          </button>
          <p className="font-serif text-base font-bold text-ink" aria-live="polite">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
            disabled={monthIndex >= months.length - 1}
            aria-label="Next month"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-ink-muted hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
          >
            <Chevron direction="right" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d) => (
            <span key={d} className="pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              {d}
            </span>
          ))}
          {Array.from({ length: firstDow }, (_, i) => (
            <span key={`blank-${i}`} aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const iso = `${month}-${String(day).padStart(2, "0")}`;
            const open = slotsByDate.has(iso);
            const selected = iso === massDate;
            return (
              <button
                key={iso}
                type="button"
                disabled={!open}
                onClick={() => chooseDate(iso)}
                aria-pressed={selected}
                aria-label={`${formatLongDate(iso)}${open ? "" : ", not available"}`}
                className={`flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  selected
                    ? "bg-accent text-white shadow-sm"
                    : open
                      ? "border border-accent/40 bg-accent/5 text-ink hover:bg-accent/15"
                      : "cursor-not-allowed text-ink-muted/50"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </Section>

      <Section step={2} title="Choose a Mass time">
        {!massDate ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-alt px-3.5 py-3 text-sm text-ink-muted">
            Choose a date first.
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm text-ink">{formatLongDate(massDate)}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {daySlots.map((item) => {
                const selected = item.id === slotId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSlotId(item.id)}
                    aria-pressed={selected}
                    className={`flex min-h-[48px] items-center justify-between rounded-lg border-2 px-3.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      selected ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-accent/40"
                    }`}
                  >
                    <span className="text-sm font-bold text-ink">{item.time}</span>
                    <span className="text-xs text-ink-muted">
                      {item.remaining} {item.remaining === 1 ? "place" : "places"} left
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Section>

      <Section step={3} title="Reason for the intention">
        <fieldset>
          <legend className="sr-only">Reason for the intention</legend>
          <div className="grid grid-cols-1 gap-2">
            {MASS_INTENTION_TYPES.map((type) => (
              <label
                key={type}
                className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border-2 px-3.5 py-2.5 transition ${
                  intentionType === type ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-accent/40"
                }`}
              >
                <input
                  type="radio"
                  name="intention-reason"
                  value={type}
                  checked={intentionType === type}
                  onChange={() => setIntentionType(type)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">{type}</span>
                  <span className="block text-xs text-ink-muted">{REASON_HINT[type]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section step={4} title="Who is this Mass for?" hint="One person per request. Submit another request for someone else.">
        <Input
          id="intention-for"
          aria-label="Name of the person"
          placeholder="Full name, e.g. Maria Santos"
          value={intentionFor}
          onChange={(e) => setIntentionFor(e.target.value)}
        />
        <div className="mt-3">
          <Input
            id="requested-by"
            label="Requested by"
            placeholder="Your full name"
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
          />
        </div>
      </Section>

      <Section step={5} title="Donation (optional)" hint="Your intention is offered whether or not you donate.">
        {gcashDonations ? (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ChoiceRadio checked={!donate} onChange={() => setDonate(false)} label="No donation" />
              <ChoiceRadio checked={donate} onChange={() => setDonate(true)} label="Donate through GCash" />
            </div>
            {donate && (
              <div className="mt-3">
                <div className="mb-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      aria-pressed={amount === String(value)}
                      className={`min-h-[40px] rounded-lg border-2 px-3.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        amount === String(value) ? "border-accent bg-accent/10 text-ink" : "border-border text-ink-muted hover:border-accent/40"
                      }`}
                    >
                      {peso(value)}
                    </button>
                  ))}
                </div>
                <Input
                  id="donation-amount"
                  label="Amount (₱)"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  placeholder="Any amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  error={amount && !donationValid ? "Enter at least ₱1." : undefined}
                />
                <p className="mt-2 text-xs text-ink-muted">
                  After you submit, you&apos;ll go to GCash to complete the donation. If you cancel there, your intention
                  stays requested.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="rounded-lg bg-surface-alt px-3.5 py-3 text-sm text-ink-muted">
            Online GCash donations aren&apos;t available yet. You can give at the parish office if you wish.
          </p>
        )}
      </Section>

      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Submitting…" : donate && donationValid && donation > 0 ? `Submit and donate ${peso(donation)}` : "Submit request"}
        </Button>
      </div>
    </FormCard>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-7">{children}</div>;
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-5 first:border-t-0 first:pt-0 [&+section]:mt-5">
      <h2 className="flex items-center gap-2.5 font-serif text-lg font-bold text-ink">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-sans text-sm text-primary">
          {step}
        </span>
        {title}
      </h2>
      {hint && <p className="mb-3 mt-1 text-sm text-ink-muted">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function ChoiceRadio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label
      className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border-2 px-3.5 py-2.5 text-sm font-semibold text-ink transition ${
        checked ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-accent/40"
      }`}
    >
      <input type="radio" name="donation-choice" checked={checked} onChange={onChange} className="h-4 w-4" />
      {label}
    </label>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <polyline
        points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
