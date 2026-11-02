import { STEPS, type StepId } from "@/features/parishioner/requests/requestFormConfig";

/**
 * Where the parishioner is in the request: numbered steps with labels on wider screens, "Step 2 of 5" and a
 * segmented bar on phones. Finished steps can be revisited.
 */
export function WizardStepTrack({ current, onJump }: { current: StepId; onJump: (step: StepId) => void }) {
  const active = STEPS.find((step) => step.id === current) ?? STEPS[0];

  return (
    <nav aria-label="Request progress" className="mb-6">
      <div className="sm:hidden">
        <p className="text-[0.8125rem] font-medium text-ink-muted">
          Step {current} of {STEPS.length} · <span className="font-semibold text-ink">{active.label}</span>
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5" aria-hidden="true">
          {STEPS.map((step) => (
            <span key={step.id} className={`h-1.5 rounded-full ${step.id <= current ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </div>

      <ol className="hidden sm:flex">
        {STEPS.map((step, i) => {
          const done = step.id < current;
          const isCurrent = step.id === current;
          const circle = (
            <span
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-[0.875rem] font-semibold transition-colors ${
                done
                  ? "border-primary bg-primary text-white"
                  : isCurrent
                    ? "border-primary bg-surface text-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_15%,transparent)]"
                    : "border-border bg-surface text-ink-muted"
              }`}
            >
              {done ? (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-4 w-4" aria-hidden="true">
                  <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                step.id
              )}
            </span>
          );
          const label = (
            <span
              className={`mt-2 block text-center text-[0.8125rem] leading-tight ${
                isCurrent ? "font-semibold text-ink" : done ? "font-medium text-ink" : "text-ink-muted"
              }`}
            >
              {step.label}
            </span>
          );
          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center" aria-current={isCurrent ? "step" : undefined}>
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-[17px] h-0.5 w-full ${step.id <= current ? "bg-primary" : "bg-border"}`}
                  aria-hidden="true"
                />
              )}
              {done ? (
                <button
                  type="button"
                  onClick={() => onJump(step.id)}
                  className="group flex flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
                  aria-label={`${step.label}, done. Go back to this step`}
                >
                  {circle}
                  <span className="group-hover:underline">{label}</span>
                </button>
              ) : (
                <>
                  {circle}
                  {label}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
