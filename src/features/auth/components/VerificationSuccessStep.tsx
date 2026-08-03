export function VerificationSuccessStep() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary">
        ✓
      </div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Verification Successful</h1>
      <p className="text-sm text-ink-muted">Email verified successfully! Your account is ready.</p>
    </div>
  );
}