import { useState } from "react";
import { ParishSearchStep } from "@/features/auth/components/ParishSearchStep";
import { DonationForm } from "@/features/parishioner/donations/DonationForm";
import { IntentionForm } from "@/features/parishioner/intentions/IntentionForm";
import type { Parish } from "@/types";

type Step = "search" | "choose" | "donate" | "intention" | "intentionDone";

export function GivePage() {
  const [step, setStep] = useState<Step>("search");
  const [parish, setParish] = useState<Parish | null>(null);

  return (
    <div className="min-h-screen bg-surface-alt px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-lg">
        {step !== "search" && (
          <button
            type="button"
            onClick={() => setStep(step === "choose" ? "search" : "choose")}
            className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
          >
            ← Back
          </button>
        )}

        {step === "search" && (
          <>
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink">Support a parish</h1>
            <p className="mb-6 text-sm text-ink-muted">
              No account needed. Find your parish to donate or request a Mass intention.
            </p>
            <ParishSearchStep
              onSelect={(selected) => {
                setParish(selected);
                setStep("choose");
              }}
            />
          </>
        )}

        {step === "choose" && parish && (
          <>
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink">{parish.name}</h1>
            <p className="mb-6 text-sm text-ink-muted">What would you like to do?</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep("donate")}
                className="flex flex-col items-start gap-2 rounded-2xl border-2 border-border bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">🤲</span>
                <span className="font-serif text-lg font-bold text-ink">Donate</span>
                <span className="text-xs text-ink-muted">Support the parish's mission via GCash.</span>
              </button>
              <button
                type="button"
                onClick={() => setStep("intention")}
                className="flex flex-col items-start gap-2 rounded-2xl border-2 border-border bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">🕯</span>
                <span className="font-serif text-lg font-bold text-ink">Mass Intention</span>
                <span className="text-xs text-ink-muted">Offer a Mass for thanksgiving, healing, or memory.</span>
              </button>
            </div>
          </>
        )}

        {step === "donate" && parish && (
          <>
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink">Support the Parish</h1>
            <p className="mb-6 text-sm text-ink-muted">{parish.name}</p>
            <DonationForm parish={parish} />
          </>
        )}

        {step === "intention" && parish && (
          <>
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink">Request a Mass Intention</h1>
            <p className="mb-6 text-sm leading-relaxed text-ink-muted">
              Offer a Mass for a special intention — thanksgiving, healing, or in memory of a loved one.
            </p>
            <IntentionForm parish={parish} requesterId={null} onSubmitted={() => setStep("intentionDone")} />
          </>
        )}

        {step === "intentionDone" && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">✓</div>
            <h2 className="font-serif text-xl font-bold text-ink">Intention submitted</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              The parish office has received your request. No account needed — your intention is confirmed for the scheduled Mass.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}