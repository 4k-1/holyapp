import { useEffect, useState, type FormEvent, type ReactNode, type SVGProps } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { requestPasswordReset } from "@/features/auth/api/authApi";
import "@/features/auth/styles/authDesk.css";

/** Matches the server: a reset link works for 30 minutes. */
const LINK_MINUTES = 30;
/** How long before "Resend" can be pressed again. */
const RESEND_SECONDS = 60;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSuperAdmin = searchParams.get("from") === "super-admin";
  const signInPath = fromSuperAdmin ? "/super-admin/login" : "/login";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function send() {
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setCooldown(RESEND_SECONDS);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (await send()) setSent(true);
  }

  async function handleResend() {
    setResent(false);
    if (await send()) setResent(true);
  }

  function useDifferentEmail() {
    setSent(false);
    setResent(false);
    setError(null);
  }

  return (
    <AuthShell parish={null} back={{ label: "Back to sign in", onClick: () => navigate(signInPath) }}>
      {sent ? (
        <div className="auth-forgot text-left">
          <IconBadge>
            <MailIcon className="h-[22px] w-[22px]" />
          </IconBadge>

          <div>
            <h1 className="auth-desk__title">Check your email</h1>
            <p className="auth-desk__subtitle">
              If an account uses <span className="font-semibold text-[var(--auth-ink)]">{email.trim()}</span>, we’ve
              sent it a link to reset your password. The link works for {LINK_MINUTES} minutes.
            </p>
          </div>

          <details className="auth-forgot__tips">
            <summary className="auth-forgot__tips-title">Didn’t get the email?</summary>
            <ul>
              <li>Check your spam or promotions folder.</li>
              <li>Make sure the address above is the one you signed up with.</li>
              <li>Wait a minute; emails can take a little while to arrive.</li>
              <li>Can’t open that email any more? Your parish office can update it on your account.</li>
              {import.meta.env.DEV && <li>Developer mode: with debug mail on, the link is in the server logs.</li>}
            </ul>
          </details>

          {error && (
            <p role="alert" className="auth-desk__error">
              {error}
            </p>
          )}
          {resent && !error && (
            <p role="status" className="auth-forgot__note">
              We sent another link. Only the newest link will work.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="auth-desk__cta"
              onClick={handleResend}
              disabled={loading || cooldown > 0}
            >
              {loading ? "Sending…" : cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
            </button>
            <button type="button" className="auth-desk__ghost mx-auto" onClick={useDifferentEmail}>
              Use a different email
            </button>
          </div>

        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-forgot text-left">
          <IconBadge>
            <KeyIcon className="h-[22px] w-[22px]" />
          </IconBadge>

          <div>
            <h1 className="auth-desk__title">Forgot your password?</h1>
            <p className="auth-desk__subtitle">
              No problem. Enter the email you use for HolyApp and we’ll send you a link to choose a new password.
            </p>
          </div>

          <div>
            <label htmlFor="forgot-email" className="auth-desk__label">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              className="auth-desk__input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
              aria-describedby="forgot-email-hint"
            />
            <p id="forgot-email-hint" className="auth-forgot__hint">
              The link works for {LINK_MINUTES} minutes.
            </p>
          </div>

          {error && (
            <p role="alert" className="auth-desk__error">
              {error}
            </p>
          )}

          <button type="submit" className="auth-desk__cta" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <p className="text-center text-[0.875rem] text-[var(--auth-ink-soft)]">
            Remembered it?{" "}
            <Link to={signInPath} className="auth-desk__link">
              Sign in
            </Link>
          </p>

          <HelpFooter />
        </form>
      )}
    </AuthShell>
  );
}

function HelpFooter() {
  return (
    <div className="auth-forgot__help">
      <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--auth-green)]" />
      <p>
        Can’t open that email any more? Your parish office can update the email on your account.
      </p>
    </div>
  );
}

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <span className="auth-forgot__badge" aria-hidden="true">
      {children}
    </span>
  );
}

function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.85 12.15 19 4" />
      <path d="m18 5 2 2" />
      <path d="m15 8 2 2" />
    </svg>
  );
}

function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}

function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
