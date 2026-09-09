import "@/features/auth/styles/authDesk.css";

export function VerificationSuccessStep() {
  return (
    <div className="auth-desk flex w-full flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--auth-green-soft)] text-2xl font-semibold text-[var(--auth-green)]">
        ✓
      </div>
      <div>
        <h1 className="auth-desk__title">Verified</h1>
        <p className="auth-desk__subtitle mx-auto max-w-xs">
          Your email is confirmed. Taking you to your parish portal…
        </p>
      </div>
    </div>
  );
}
