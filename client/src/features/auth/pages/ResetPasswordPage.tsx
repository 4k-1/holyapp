import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { AuthPasswordField } from "@/features/auth/components/AuthPasswordField";
import { resetPassword } from "@/features/auth/api/authApi";
import "@/features/auth/styles/authDesk.css";

export function ResetPasswordPage() {
  const { token: tokenParam } = useParams();
  const [searchParams] = useSearchParams();
  const token = tokenParam || searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell parish={null}>
            {done ? (
              <div className="flex flex-col gap-4 text-left">
                <h1 className="auth-desk__title">Password updated</h1>
                <p className="auth-desk__subtitle">
                  Your password has been changed. You can sign in with your new password.
                </p>
                <Link to="/login" className="auth-desk__link w-fit text-[0.875rem]">
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-left">
                <div>
                  <h1 className="auth-desk__title">Set a new password</h1>
                  <p className="auth-desk__subtitle">Choose a password with at least 8 characters.</p>
                </div>

                <AuthPasswordField
                  id="reset-password"
                  label="New password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={8}
                />
                <AuthPasswordField
                  id="reset-confirm-password"
                  label="Confirm password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={8}
                />

                {error && (
                  <p role="alert" className="auth-desk__error">
                    {error}
                  </p>
                )}

                <button type="submit" className="auth-desk__cta" disabled={loading || !token}>
                  {loading ? "Saving…" : "Update password"}
                </button>

                <p className="border-t border-[var(--auth-border)] pt-5 text-center text-[0.84375rem] text-[var(--auth-ink-soft)]">
                  <Link to="/login" className="auth-desk__link">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
    </AuthShell>
  );
}
