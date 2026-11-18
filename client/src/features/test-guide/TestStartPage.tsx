import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGuideStatus, getTesterSignIn, writeLocalTester } from "./testGuideApi";

const TESTERS = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * UAT only: where testers start. They pick the tester number they were given, and HolyApp opens their
 * parish's sign-in page with the test guide showing the email and password to use.
 */
export function TestStartPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    getGuideStatus()
      .then((s) => setEnabled(s.enabled))
      .catch(() => setEnabled(false));
  }, []);

  async function start(n: number) {
    setBusy(n);
    setError(null);
    try {
      const tester = await getTesterSignIn(n);
      writeLocalTester({ n, parishSlug: tester.parishSlug });
      navigate(`/${tester.parishSlug}/login`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start. Try again.");
      setBusy(null);
    }
  }

  return (
    <div data-portal="admin" className="min-h-screen bg-surface-alt px-4 py-12">
      <main className="mx-auto max-w-md rounded-[20px] border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="font-serif text-[1.75rem] font-bold leading-tight text-ink">HolyApp testing</h1>
        {enabled === false ? (
          <p className="mt-3 text-[0.9375rem] text-ink-muted">Testing is not open on this site.</p>
        ) : (
          <>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
              Thank you for helping us test HolyApp. Choose the tester number you were given. A guide at the bottom of the
              screen will then show you each step and what to type.
            </p>
            <p className="mt-5 text-sm font-semibold text-ink">Your tester number</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {TESTERS.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={enabled === null || busy !== null}
                  onClick={() => void start(n)}
                  className="rounded-xl border border-border bg-surface py-3 text-lg font-semibold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {n}
                </button>
              ))}
            </div>
            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}
            <p className="mt-5 text-xs text-ink-muted">
              Everything here is a test. The people and records are made up, and payments use GCash test mode: no real
              money is taken.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
