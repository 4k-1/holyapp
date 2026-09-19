const trackerSteps = ["Pending", "Approved", "Pay", "Processing", "Released"];

export function ConfirmationStep() {
  return (
    <div className="py-5 text-center">
      {/* Success badge */}
      <div className="relative mx-auto mb-5 h-[84px] w-[84px]">
        {/* soft ambient glow */}
        <div className="absolute inset-0 -z-10 rounded-full bg-emerald-500/25 blur-xl" />
        {/* outer ring */}
        <div className="absolute inset-0 rounded-full ring-8 ring-emerald-50" />
        {/* badge */}
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-600/30">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-9 w-9"
            stroke="white"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4.5 4.5L19 7" />
          </svg>
        </div>
      </div>

      <h2 className="mb-1.5 font-serif text-2xl font-bold text-ink">Request submitted</h2>
      <p className="mx-auto mb-6 max-w-sm text-sm text-ink-muted">
        We'll email you at each step. Once staff approve your record match, you'll be asked to pay the certificate
        fee — no payment needed right now.
      </p>

      <div className="relative mx-auto flex max-w-md pt-1">
        <div className="absolute left-[11px] right-[11px] top-[14px] h-0 border-t-2 border-dashed border-border" />
        {trackerSteps.map((label, i) => {
          const isCurrent = i === 0;
          return (
            <div key={label} className="relative z-10 flex flex-1 flex-col items-center gap-2">
              <div
                className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                  isCurrent ? "border-emerald-600 bg-white" : "border-dashed border-border bg-surface"
                }`}
              >
                {isCurrent && <span className="h-[8px] w-[8px] rounded-full bg-emerald-600" />}
              </div>
              <span
                className={`text-center text-[11px] leading-tight ${
                  isCurrent ? "font-bold text-emerald-700" : "text-ink-muted"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
