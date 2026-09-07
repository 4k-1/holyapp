import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ParishBrandingPanel } from "@/features/auth/components/ParishBrandingPanel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { resetPassword } from "@/features/auth/api/authApi";

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
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2 h-screen">
      <ParishBrandingPanel parish={null} />
      <div className="relative flex items-center justify-center overflow-hidden bg-canvas p-6 md:p-8">
        <div className="relative w-full lg:w-md max-w-[90%]">
          {done ? (
            <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary">
                ✓
              </div>
              <h1 className="font-serif text-2xl font-semibold text-ink">Password updated</h1>
              <p className="text-sm text-ink-muted">
                Your password has been changed. You can sign in with your new password.
              </p>
              <Link to="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5 text-left">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Account recovery
                </p>
                <h1 className="mt-1.5 font-serif text-2xl font-semibold leading-snug text-ink">
                  Set a new password
                </h1>
              </div>

              <Input
                type="password"
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <Input
                type="password"
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />

              {error && (
                <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
                {loading ? "Saving..." : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
