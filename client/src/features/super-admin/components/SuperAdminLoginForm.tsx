import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AdminButton, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { getCurrentUser, loginSuperAdmin } from "@/features/auth/api/authApi";

export function SuperAdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <form onSubmit={handleSubmit} className="mt-10 flex w-full flex-col text-left">
      <h1 className="font-serif text-admin-page font-semibold text-admin-ink">Sign in</h1>
      <p className="mt-2 text-admin-body text-admin-ink-muted">
        For platform operators. Parish staff sign in through their parish.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <div>
          <label
            htmlFor="super-admin-email"
            className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted"
          >
            Email
          </label>
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
        </div>
        <div>
          <label
            htmlFor="super-admin-password"
            className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted"
          >
            Password
          </label>
          <AdminInput
            id="super-admin-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
            className="disabled:bg-admin-surface-alt disabled:opacity-60"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[7px] bg-admin-red-100 px-3 py-2 text-admin-body text-admin-red-700"
        >
          {error}
        </p>
      )}

      <AdminButton type="submit" variant="primary" disabled={loading} className="mt-6 w-full py-2.5">
        {loading ? "Signing in..." : "Sign in"}
      </AdminButton>

      <p className="mt-8 border-t border-admin-border pt-5 text-center text-admin-support text-admin-ink-muted">
        Looking for your parish?{" "}
        <Link
          to="/login"
          className="font-semibold text-admin-green-700 underline decoration-admin-green-100 underline-offset-2 hover:text-admin-green-900"
        >
          Find it here
        </Link>
      </p>
    </form>
  );
}
