import { useState } from "react";
import { Link } from "react-router-dom";
import { ParishSearchStep } from "@/features/auth/components/ParishSearchStep";
import type { Parish } from "@/types";

/** Find a parish, then give or request a Mass intention. No account needed for either. */
export function GivePage() {
  const [parish, setParish] = useState<Parish | null>(null);

  return (
    <div className="min-h-screen bg-surface-alt px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        {!parish ? (
          <>
            <h1 className="mb-1 font-serif text-[1.75rem] font-bold text-ink">Support a parish</h1>
            <p className="mb-6 text-[0.9375rem] text-ink-muted">
              Find your parish to give or to request a Mass intention. No account needed.
            </p>
            <ParishSearchStep onSelect={setParish} />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setParish(null)}
              className="mb-5 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Choose another parish
            </button>
            <h1 className="mb-1 font-serif text-[1.75rem] font-bold text-ink">{parish.name}</h1>
            <p className="mb-6 text-[0.9375rem] text-ink-muted">What would you like to do?</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ChoiceCard
                to={`/give/${parish.slug}/donate`}
                title="Give a donation"
                body="Support the parish through GCash."
              />
              <ChoiceCard
                to={`/give/${parish.slug}/intention`}
                title="Request a Mass intention"
                body="Offer a Mass for thanksgiving, healing, or in memory of someone."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChoiceCard({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-6 text-left shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="font-serif text-lg font-semibold text-ink">{title}</span>
      <span className="text-sm text-ink-muted">{body}</span>
      <span className="mt-2 text-sm font-semibold text-primary">Continue →</span>
    </Link>
  );
}
