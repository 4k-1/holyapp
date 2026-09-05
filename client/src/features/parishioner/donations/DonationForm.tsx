import { useState } from "react";
import { Input } from "@/components/ui/Input";
import type { Parish } from "@/types";

const presetAmounts = [100, 300, 500, 1000];

const donationPurposes = [
  "General Fund",
  "Church Repair & Maintenance",
  "Outreach & Charity Program",
  "Feast Day Celebration",
  "Other",
];

interface DonationFormProps {
  parish: Parish;
  defaultFullName?: string;
}

export function DonationForm({ parish, defaultFullName = "" }: DonationFormProps) {
  const [amount, setAmount] = useState<string>("500");
  const [isCustom, setIsCustom] = useState(false);
  const [purpose, setPurpose] = useState(donationPurposes[0]);
  const [fullName, setFullName] = useState(defaultFullName);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectiveAmount = amount ? Number(amount) : null;
  const canDonate = Boolean(effectiveAmount && effectiveAmount > 0);

  function handlePresetClick(preset: number) {
    setIsCustom(false);
    setAmount(String(preset));
  }

  function handleCustomAmountChange(value: string) {
    const digitsOnly = value.replace(/[^\d]/g, "");
    setIsCustom(true);
    setAmount(digitsOnly);
  }

  async function handleDonate() {
    if (!canDonate) return;
    setSubmitting(true);
    console.info("[mock] Redirecting to GCash", {
      amount: effectiveAmount,
      purpose,
      fullName: fullName || "Anonymous",
      message,
      parishId: parish.id,
    });
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-7">
      <label className="mb-3 block text-[11.5px] font-bold uppercase tracking-widest text-ink-muted">
        Choose an amount
      </label>
      <div className="mb-3 grid grid-cols-4 gap-2.5">
        {presetAmounts.map((preset) => {
          const selected = !isCustom && amount === String(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`rounded-xl border-2 py-3 text-sm font-bold transition-all ${
                selected
                  ? "border-accent bg-accent/10 text-ink shadow-sm"
                  : "border-border bg-surface text-ink-muted hover:border-accent/40 hover:bg-surface-alt/50"
              }`}
            >
              ₱{preset}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        inputMode="numeric"
        placeholder="Other amount"
        value={isCustom && amount ? `₱${amount}` : ""}
        onChange={(e) => handleCustomAmountChange(e.target.value)}
        onFocus={() => setIsCustom(true)}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/25 ${
          isCustom ? "border-accent bg-accent/[0.04]" : "border-border bg-surface"
        }`}
      />

      <div className="mt-5">
        <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">
          Purpose
        </label>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          {donationPurposes.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <Input label="Full name" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <p className="mt-1 text-xs text-ink-muted">Optional — leave blank to donate anonymously.</p>
      </div>

      <div className="mt-4">
        <Input label="Message (optional)" placeholder="Leave a message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <button
        type="button"
        onClick={handleDonate}
        disabled={!canDonate || submitting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0074e4] py-3.5 text-[15px] font-bold text-white shadow-[0_6px_18px_rgba(0,116,228,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,116,228,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {submitting ? "Redirecting..." : `Donate ${effectiveAmount ? `₱${effectiveAmount}` : ""} via GCash`}
      </button>
      <p className="mt-2.5 text-center text-[11.5px] text-ink-muted">
        You'll be redirected to GCash to complete payment securely.
      </p>
    </div>
  );
}