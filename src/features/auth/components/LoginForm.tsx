import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { login } from "@/features/auth/api/authApi";
import type { Parish } from "@/types";

interface LoginFormProps {
  parish: Parish;
  onBack: () => void;
}

export function LoginForm({ parish, onBack }: LoginFormProps) {
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
      if (user.role === "super_admin") {
        navigate("/super-admin");
      } else if (user.role === "parish_admin" || user.role === "parish_staff") {
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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5 text-left">
      <button
        type="button"
        onClick={onBack}
        className="group flex w-fit items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted transition-colors hover:text-primary"
      >
        <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
          ←
        </span>
        Change parish
      </button>

     {/* Seal + name header — now shown on all breakpoints */}
      <div className="flex flex-col items-center gap-2.5 text-center">
        {parish.sealUrl ? (
          <img
            src={parish.sealUrl}
            alt={`${parish.name} seal`}
            className="h-16 w-16 shrink-0 rounded-full bg-white object-contain p-1.5 shadow-lg ring-2 ring-white/50"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white font-serif text-xl font-semibold text-primary shadow-lg ring-2 ring-white/50">
            {parish.name.charAt(0)}
          </div>
        )}
        <p className="font-serif text-sm font-semibold uppercase leading-snug tracking-wide text-ink">
          {parish.name}
        </p>
        <div className="h-px w-10" style={{ background: "#d4a017" }} aria-hidden />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Sign in to
        </p>
        <h1 className="mt-1.5 font-serif text-2xl font-semibold leading-snug text-ink">
          Parish Portal
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          type="email"
          label="Email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          autoComplete="email"
          icon={<span aria-hidden>✉</span>}
        />
        <Input
          type="password"
          label="Password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
        {loading ? "Signing in..." : "Sign in"}
      </Button>

      <p className="border-t border-border pt-5 text-center text-sm text-ink-muted">
        No account?{" "}
        <a href={`/${parish.slug}/register`} className="font-medium text-primary hover:underline">
        Register as a parishioner
      </a>
      </p>
    </form>
  );
}