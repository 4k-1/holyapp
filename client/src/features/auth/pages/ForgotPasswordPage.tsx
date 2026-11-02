import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { requestPasswordReset } from "@/features/auth/api/authApi";
import "@/features/auth/styles/authDesk.css";

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const fromSuperAdmin = searchParams.get("from") === "super-admin";
  const signInPath = fromSuperAdmin ? "/super-admin/login" : "/login";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell parish={null}>
            {sent ? (
              <div className="flex flex-col gap-4 text-left">
                <h1 className="auth-desk__title">Check your email</h1>
                <p className="auth-desk__subtitle">
                  If an account exists for <span className="font-semibold text-[var(--auth-ink)]">{email.trim()}</span>,
                  we sent a reset link. With debug mail on, copy the link from the server logs.
                </p>
                <Link to={signInPath} className="auth-desk__link w-fit text-[0.875rem]">
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-8 text-left">
                <div>
                  <h1 className="auth-desk__title">Forgot password</h1>
                  <p className="auth-desk__subtitle">Enter your email and we’ll send a reset link.</p>
                </div>

                <div>
                  <label htmlFor="forgot-email" className="auth-desk__label">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="auth-desk__input"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <p role="alert" className="auth-desk__error">
                    {error}
                  </p>
                )}

                <button type="submit" className="auth-desk__cta" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>

                <p className="border-t border-[var(--auth-border)] pt-5 text-center text-[0.84375rem] text-[var(--auth-ink-soft)]">
                  <Link to={signInPath} className="auth-desk__link">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
    </AuthShell>
  );
}
