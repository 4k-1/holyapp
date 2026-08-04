const trackerSteps = ["Pending", "Approved", "Pay", "Processing", "Released"];

export function ConfirmationStep() {
  return (
    <div className="py-5 text-center">
      <div className="mx-auto mb-4 flex h-[78px] w-[78px] items-center justify-center rounded-full border-2 border-accent bg-gradient-to-br from-white to-accent/40 text-3xl text-primary">
        ✓
      </div>
      <h2 className="mb-1.5 font-serif text-2xl font-bold text-ink">Request submitted</h2>
      <p className="mx-auto mb-6 max-w-sm text-sm text-ink-muted">
        We'll email you at each step. Once staff approve your record match, you'll be asked to pay the certificate
        fee — no payment needed right now.
      </p>

      <div className="relative mx-auto flex max-w-md pt-1">
        <div className="absolute left-[11px] right-[11px] top-[15px] h-0.5 bg-border" />
        {trackerSteps.map((label, i) => (
          <div key={label} className="relative z-10 flex flex-1 flex-col items-center gap-2">
            <div
              className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                i === 0 ? "border-primary bg-primary/80 shadow-[0_0_0_4px_rgba(26,61,43,0.15)]" : "border-border bg-surface"
              }`}
            />
            <span className={`text-center text-[11px] leading-tight ${i === 0 ? "font-bold text-primary" : "text-ink-muted"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}