import { useMemo, useState, type ReactNode } from "react";
import {
  AmountPicker,
  ChoiceButton,
  PortalFormCard,
  PortalFormSection,
  PortalNotice,
  PrimarySubmit,
  RadioCard,
  TextField,
} from "@/features/parishioner/components/PortalForm";
import {
  listOpenMassSlots,
  submitMassIntention,
  type OpenMassSlot,
  type SubmitIntentionInput,
} from "@/features/parishioner/intentions/intentionsApi";
import { useAsync } from "@/hooks/useAsync";
import { MASS_INTENTION_TYPES, type Parish } from "@/types";

interface IntentionFormProps {
  parish: Parish;
  defaultRequestedBy?: string;
  /** Called after a request without a donation; a donation continues to GCash instead. */
  onSubmitted?: () => void;
  /** Where open Masses come from and where the request goes; default to the signed-in parishioner's. */
  loadSlots?: () => Promise<{ slots: OpenMassSlot[]; gcashDonations: boolean }>;
  submit?: (input: SubmitIntentionInput) => Promise<{ checkoutUrl: string | null }>;
  /** A visitor without an account: asks for a mobile number or email so the office can reach them. */
  guest?: boolean;
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

export function IntentionForm({
  parish,
  defaultRequestedBy = "",
  onSubmitted,
  loadSlots = listOpenMassSlots,
  submit = submitMassIntention,
  guest = false,
}: IntentionFormProps) {
  // The loader is fixed for the life of the form, so only the parish re-runs it.
  const { data, loading, error: loadError } = useAsync(() => loadSlots(), [parish.id]);
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
  const [contact, setContact] = useState("");
  const [donate, setDonate] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const daySlots = slotsByDate.get(massDate) ?? [];
  const slot = daySlots.find((item) => item.id === slotId) ?? null;
  const donation = donate ? Number(amount) : 0;
  const donationValid = !donate || (Number.isFinite(donation) && donation >= 1);
  const canSubmit = Boolean(
    slot && intentionFor.trim() && requestedBy.trim() && donationValid && (!guest || contact.trim())
  );

  function chooseDate(iso: string) {
    setMassDate(iso);
    setSlotId("");
  }

  async function handleSubmit() {
    if (!slot || !canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await submit({
        parishId: parish.id,
        requesterId: null,
        intentionType,
        intentionFor: intentionFor.trim(),
        requestedBy: requestedBy.trim(),
        scheduleDate: slot.date,
        scheduleTime: slot.time,
        scheduleLabel: slot.scheduleLabel,
        donation: donate ? donation : 0,
        contact: contact.trim() || undefined,
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
    return <MessageCard>Loading the Mass schedule…</MessageCard>;
  }
  if (loadError) {
    return <PortalNotice tone="error">{loadError.message}</PortalNotice>;
  }
  if (slots.length === 0) {
    return (
      <MessageCard>
        <span className="block font-semibold text-ink">No open Masses right now</span>
        Every Mass in the next two months is already full. Please contact the parish office.
      </MessageCard>
    );
  }

  const month = months[Math.min(monthIndex, months.length - 1)];
  const [year, monthNum] = month.split("-").map(Number);
  const firstDow = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <PortalFormCard>
      <PortalFormSection step={1} title="Mass date" hint="Highlighted dates still have room for another intention.">
        <div className="rounded-xl border border-border p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <MonthButton
              label="Previous month"
              direction="left"
              disabled={monthIndex === 0}
              onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
            />
            <p className="text-[0.9375rem] font-semibold text-ink" aria-live="polite">
              {monthLabel}
            </p>
            <MonthButton
              label="Next month"
              direction="right"
              disabled={monthIndex >= months.length - 1}
              onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
            />
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="pb-1 text-xs font-medium text-ink-muted">
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
                  className={`flex h-10 items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    selected
                      ? "bg-primary font-semibold text-white"
                      : open
                        ? "bg-primary/[0.07] font-semibold text-primary hover:bg-primary/[0.14]"
                        : "cursor-not-allowed text-ink-muted/45"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </PortalFormSection>

      <PortalFormSection step={2} title="Mass time" hint={massDate ? formatLongDate(massDate) : undefined}>
        {!massDate ? (
          <p className="rounded-xl border border-dashed border-border bg-surface-alt/60 px-4 py-3 text-sm text-ink-muted">
            Choose a date first.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {daySlots.map((item) => (
              <ChoiceButton
                key={item.id}
                selected={item.id === slotId}
                onClick={() => setSlotId(item.id)}
                className="flex min-h-[52px] items-center justify-between px-4 py-2.5 text-left"
              >
                <span className="text-[0.9375rem] font-semibold tabular-nums text-ink">{item.time}</span>
                <span className="text-[0.8125rem] text-ink-muted">
                  {item.remaining} {item.remaining === 1 ? "place" : "places"} left
                </span>
              </ChoiceButton>
            ))}
          </div>
        )}
      </PortalFormSection>

      <PortalFormSection step={3} title="Reason for the intention">
        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <legend className="sr-only">Reason for the intention</legend>
          {MASS_INTENTION_TYPES.map((type) => (
            <RadioCard
              key={type}
              name="intention-reason"
              checked={intentionType === type}
              onChange={() => setIntentionType(type)}
              title={type}
              description={REASON_HINT[type]}
            />
          ))}
        </fieldset>
      </PortalFormSection>

      <PortalFormSection
        step={4}
        title="Who is this Mass for?"
        hint="One person per request. Submit another request for someone else."
      >
        <TextField
          id="intention-for"
          label="Name of the person"
          placeholder="Full name, e.g. Maria Santos"
          value={intentionFor}
          onChange={(e) => setIntentionFor(e.target.value)}
        />
        <TextField
          id="requested-by"
          className="mt-3"
          label="Requested by"
          placeholder="Your full name"
          value={requestedBy}
          onChange={(e) => setRequestedBy(e.target.value)}
        />
        {guest && (
          <TextField
            id="requester-contact"
            className="mt-3"
            label="Your mobile number or email"
            hint="So the parish office can reach you about this Mass."
            placeholder="e.g. 0917 123 4567"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        )}
      </PortalFormSection>

      <PortalFormSection step={5} title="Donation (optional)" hint="Your intention is offered whether or not you donate.">
        {gcashDonations ? (
          <>
            <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <legend className="sr-only">Donation</legend>
              <RadioCard name="donation-choice" checked={!donate} onChange={() => setDonate(false)} title="No donation" />
              <RadioCard
                name="donation-choice"
                checked={donate}
                onChange={() => setDonate(true)}
                title="Donate through GCash"
              />
            </fieldset>
            {donate && (
              <div className="mt-4">
                <AmountPicker
                  id="donation-amount"
                  presets={QUICK_AMOUNTS}
                  value={amount}
                  onChange={setAmount}
                  error={amount && !donationValid ? "Enter at least ₱1." : undefined}
                />
                <p className="mt-2 text-[0.8125rem] text-ink-muted">
                  After you submit, you&apos;ll finish the donation on GCash. If you cancel there, your intention stays
                  requested.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="rounded-xl bg-surface-alt px-4 py-3 text-sm text-ink-muted">
            Online GCash donations aren&apos;t available yet. You can give at the parish office if you wish.
          </p>
        )}
      </PortalFormSection>

      <div className="px-5 py-5 sm:px-6">
        {error && (
          <div className="mb-3">
            <PortalNotice tone="error">{error}</PortalNotice>
          </div>
        )}
        <PrimarySubmit onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting
            ? "Submitting…"
            : donate && donationValid && donation > 0
              ? `Submit and donate ${peso(donation)}`
              : "Submit request"}
        </PrimarySubmit>
      </div>
    </PortalFormCard>
  );
}

function MessageCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-8 text-center text-sm text-ink-muted shadow-sm">
      {children}
    </div>
  );
}

function MonthButton({
  label,
  direction,
  disabled,
  onClick,
}: {
  label: string;
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-alt hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-35"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
        <polyline
          points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
