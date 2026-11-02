import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login } from "@/features/auth/api/authApi";
import { AuthPasswordField } from "@/features/auth/components/AuthPasswordField";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

interface LoginFormProps {
  parish: Parish;
}

export function LoginForm({ parish }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      const from = searchParams.get("from");
      if (from) {
        navigate(from);
        return;
      }
      if (user.role === "parish_admin" || user.role === "parish_staff") {
        navigate(`/${parish.slug}/admin`);
      } else {
        navigate(`/${parish.slug}/portal`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-desk flex w-full flex-col gap-8 text-left">
      <div>
        <h1 className="auth-desk__title">Welcome back</h1>
        <p className="auth-desk__subtitle">Sign in to your parish account.</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="login-email" className="auth-desk__label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="auth-desk__input"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="auth-desk__label mb-0">
              Password
            </label>
            <button
              type="button"
              className="auth-desk__ghost shrink-0 text-[0.75rem]"
              onClick={() => {
                const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
                navigate(`/forgot-password${q}`);
              }}
            >
              Forgot password?
            </button>
          </div>
          <AuthPasswordField
            id="login-password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="auth-desk__error">
          {error}
        </p>
      )}

      <button type="submit" className="auth-desk__cta" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-[0.875rem] text-[var(--auth-ink-soft)]">
        New to the parish portal?{" "}
        <a href={`/${parish.slug}/register`} className="auth-desk__link">
          Create an account
        </a>
      </p>
    </form>
  );
}
