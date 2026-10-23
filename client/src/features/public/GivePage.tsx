import { useState } from "react";
import { ParishSearchStep } from "@/features/auth/components/ParishSearchStep";
import { IntentionSignInPrompt } from "@/features/public/IntentionSignInPrompt";
import type { Parish } from "@/types";

type Step = "search" | "choose" | "donate" | "intention";

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
              Find your parish to donate. Mass intentions are requested from your parish account.
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
                className="flex flex-col items-start gap-2 rounded-2xl border-2 border-border bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">🤲</span>
                <span className="font-serif text-lg font-bold text-ink">Donate</span>
                <span className="text-xs text-ink-muted">Support the parish's mission via GCash.</span>
              </button>
              <button
                type="button"
                onClick={() => setStep("intention")}
                className="flex flex-col items-start gap-2 rounded-2xl border-2 border-border bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
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
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink">Support the parish</h1>
            <p className="mb-6 text-sm text-ink-muted">{parish.name}</p>
            <IntentionSignInPrompt parish={parish} purpose="donation" />
          </>
        )}

        {step === "intention" && parish && (
          <>
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink">Request a Mass intention</h1>
            <p className="mb-6 text-sm leading-relaxed text-ink-muted">
              Offer a Mass for a special intention — thanksgiving, healing, or in memory of a loved one.
            </p>
            <IntentionSignInPrompt parish={parish} />
          </>
        )}
      </div>
    </div>
  );
}