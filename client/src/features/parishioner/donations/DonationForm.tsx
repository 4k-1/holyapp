import { useState } from "react";
import {
  AmountPicker,
  PortalFormCard,
  PortalFormSection,
  PortalNotice,
  PrimarySubmit,
  RadioCard,
  TextField,
} from "@/features/parishioner/components/PortalForm";
import { giveDonation, type GiveInput } from "@/features/parishioner/donations/donationsApi";

const PRESET_AMOUNTS = [100, 300, 500, 1000];
/** PayMongo's smallest GCash charge. */
const MIN_AMOUNT = 20;

const PURPOSES = [
  { title: "General fund", description: "Where the parish needs it most" },
  { title: "Church repair and maintenance", description: "Upkeep of the church and grounds" },
  { title: "Outreach and charity", description: "Help for families in need" },
  { title: "Feast day celebration", description: "The parish fiesta and liturgies" },
];

interface DonationFormProps {
  defaultFullName?: string;
  gcashAvailable: boolean;
  /** Starts the GCash checkout; defaults to the signed-in parishioner's. */
  onGive?: (input: GiveInput) => Promise<{ checkoutUrl: string }>;
  /** A visitor without an account: asks for an email for the receipt. */
  guest?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DonationForm({ defaultFullName = "", gcashAvailable, onGive = giveDonation, guest = false }: DonationFormProps) {
  const [amount, setAmount] = useState("500");
  const [purpose, setPurpose] = useState(PURPOSES[0].title);
  const [anonymous, setAnonymous] = useState(false);
  const [fullName, setFullName] = useState(defaultFullName);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const value = Number(amount);
  const amountError = amount && value < MIN_AMOUNT ? `The smallest GCash gift is ₱${MIN_AMOUNT}.` : undefined;
  const emailError = email.trim() && !EMAIL_PATTERN.test(email.trim()) ? "Enter a valid email address." : undefined;
  const canGive =
    gcashAvailable && value >= MIN_AMOUNT && (anonymous || fullName.trim().length > 0) && !emailError;

  async function handleGive() {
    if (!canGive) return;
    setSubmitting(true);
    setError("");
    try {
      const { checkoutUrl } = await onGive({
        amount: value,
        purpose,
        donorName: anonymous ? undefined : fullName.trim(),
        message: message.trim() || undefined,
        email: guest ? email.trim() || undefined : undefined,
      });
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the donation.");
      setSubmitting(false);
    }
  }

  return (
    <PortalFormCard>
      <PortalFormSection step={1} title="Amount">
        <AmountPicker id="gift-amount" presets={PRESET_AMOUNTS} value={amount} onChange={setAmount} error={amountError} />
      </PortalFormSection>

      <PortalFormSection step={2} title="Purpose">
        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <legend className="sr-only">Purpose of the gift</legend>
          {PURPOSES.map((item) => (
            <RadioCard
              key={item.title}
              name="gift-purpose"
              checked={purpose === item.title}
              onChange={() => setPurpose(item.title)}
              title={item.title}
              description={item.description}
            />
          ))}
        </fieldset>
      </PortalFormSection>

      <PortalFormSection step={3} title="Your details">
        <label className="mb-3 flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--color-primary)]"
          />
          Give anonymously
        </label>
        {!anonymous && (
          <TextField
            id="gift-name"
            label="Name shown to the parish office"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}
        {guest && (
          <TextField
            id="gift-email"
            className="mt-3"
            type="email"
            label="Email for your receipt (optional)"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
          />
        )}
        <TextField
          id="gift-message"
          className="mt-3"
          label="Message (optional)"
          placeholder="e.g. In thanksgiving for my family"
          value={message}
          maxLength={200}
          onChange={(e) => setMessage(e.target.value)}
        />
      </PortalFormSection>

      <div data-pf="footer" className="px-5 py-5 sm:px-6">
        {!gcashAvailable && (
          <div className="mb-3">
            <PortalNotice tone="info">
              Online GCash giving isn&apos;t available yet. You can give at the parish office.
            </PortalNotice>
          </div>
        )}
        {error && (
          <div className="mb-3">
            <PortalNotice tone="error">{error}</PortalNotice>
          </div>
        )}
        <PrimarySubmit onClick={handleGive} disabled={!canGive || submitting}>
          {submitting
            ? "Opening GCash…"
            : value >= MIN_AMOUNT
              ? `Give ₱${value.toLocaleString("en-PH")} through GCash`
              : "Give through GCash"}
        </PrimarySubmit>
        <p className="mt-2.5 text-center text-[0.8125rem] text-ink-muted">
          You&apos;ll finish on GCash&apos;s secure page, then return here.
        </p>
      </div>
    </PortalFormCard>
  );
}
