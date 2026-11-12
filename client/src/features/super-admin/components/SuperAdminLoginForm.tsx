import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons/AdminIcons";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { getCurrentUser, loginSuperAdmin } from "@/features/auth/api/authApi";

export function SuperAdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (getCurrentUser()?.role === "super_admin") {
      navigate("/super-admin", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginSuperAdmin(email.trim(), password);
      const from = searchParams.get("from");
      navigate(from && from.startsWith("/super-admin") ? from : "/super-admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col text-left">
      <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-admin-ink sm:text-[1.5rem]">
        Sign in
      </h1>
      <p className="mt-1.5 text-admin-body text-admin-ink-muted">
        For platform operators. Parish staff sign in through their parish.
      </p>

      <div className="mt-7 flex flex-col gap-4">
        <AdminField label="Email" className="mb-0">
          <AdminInput
            id="super-admin-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="username"
            autoFocus
            className="disabled:bg-admin-surface-alt disabled:opacity-60"
          />
        </AdminField>
        <AdminField label="Password" className="mb-0">
          <div className="relative">
            <AdminInput
              id="super-admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              className="pr-11 disabled:bg-admin-surface-alt disabled:opacity-60"
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-admin-ink-faint hover:bg-admin-bg hover:text-admin-ink disabled:opacity-50"
              onClick={() => setShowPassword((v) => !v)}
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOffIcon className="h-4 w-4" aria-hidden />
              ) : (
                <EyeIcon className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </AdminField>
        <p className="-mt-2 text-right">
          <Link
            to={
              email.trim()
                ? `/forgot-password?from=super-admin&email=${encodeURIComponent(email.trim())}`
                : "/forgot-password?from=super-admin"
            }
            className="font-semibold text-admin-green-700 underline decoration-admin-green-100 underline-offset-2 hover:text-admin-green-600"
          >
            Forgot password?
          </Link>
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-admin-red-100 px-3 py-2 text-admin-body text-admin-red-700"
        >
          {error}
        </p>
      )}

      <AdminButton type="submit" variant="primary" disabled={loading} className="mt-6 w-full !rounded-md py-2.5">
        {loading ? "Signing in…" : "Sign in"}
      </AdminButton>

      <p className="mt-8 border-t border-admin-border pt-5 text-center text-admin-support text-admin-ink-muted">
        Looking for your parish?{" "}
        <Link
          to="/login"
          className="font-semibold text-admin-green-700 underline decoration-admin-green-100 underline-offset-2 hover:text-admin-green-600"
        >
          Find it here
        </Link>
      </p>
    </form>
  );
}
