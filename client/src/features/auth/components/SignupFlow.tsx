import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { AuthPasswordField } from "@/features/auth/components/AuthPasswordField";
import { OtpStep } from "@/features/auth/components/OtpStep";
import { VerificationSuccessStep } from "@/features/auth/components/VerificationSuccessStep";
import { finishSignup, startSignup, verifySignupCode } from "@/features/auth/api/authApi";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

type Step = "email" | "code" | "about" | "password" | "done";
const STEPS: Step[] = ["email", "code", "about", "password"];

interface SignupFlowProps {
  parish: Parish;
  /** Back from the first step: choose another parish. */
  onChangeParish: () => void;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Parishioner sign-up, email first: email → 4-digit code → name and birthday → password.
 * The account is made only on the last step, so a mistyped email never leaves an account behind.
 */
export function SignupFlow({ parish, onChangeParish }: SignupFlowProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await startSignup(email, parish.id);
      go("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setLoading(false);
    }
  }

  async function checkCode(code: string) {
    setSignupToken(await verifySignupCode(email, code));
    go("about");
  }

  function saveAbout(e: FormEvent) {
    e.preventDefault();
    if (birthday > today()) {
      setError("Your birthday can't be in the future.");
      return;
    }
    go("password");
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("The passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await finishSignup({ email, signupToken, firstName, middleName: middleName || undefined, lastName, birthday, password });
      go("done");
      setTimeout(() => navigate(`/${parish.slug}/portal`), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the account.";
      if (/expired/i.test(message)) {
        // The 30 minutes after the code ran out: prove the email again, keeping what was typed.
        setSignupToken("");
        setStep("email");
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function back() {
    if (step === "code") go("email");
    else if (step === "password") go("about");
    else if (step === "about") go("email");
    else onChangeParish();
  }

  const position = STEPS.indexOf(step);
  const errorLine = error && (
    <p role="alert" className="auth-desk__error">
      {error}
    </p>
  );

  return (
    <AuthShell
      parish={parish}
      back={step === "done" ? undefined : { label: step === "email" ? "Change parish" : "Back", onClick: back }}
    >
      {step !== "done" && (
        <div
          className="auth-progress"
          role="progressbar"
          aria-label="Sign-up progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={position + 1}
        >
          {STEPS.map((s, i) => (
            <span key={s} className={i <= position ? "is-done" : undefined} />
          ))}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={sendCode} className="auth-desk flex w-full flex-col gap-8 text-left">
          <div>
            <h1 className="auth-desk__title">Create your account</h1>
            <p className="auth-desk__subtitle">Start with your email. We&apos;ll send a 4-digit code to confirm it&apos;s yours.</p>
          </div>
          <div>
            <label htmlFor="signup-email" className="auth-desk__label">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              className="auth-desk__input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>
          {errorLine}
          <button type="submit" className="auth-desk__cta" disabled={loading}>
            {loading ? "Sending code…" : "Send code"}
          </button>
          <p className="text-center text-[0.875rem] text-[var(--auth-ink-soft)]">
            Already have an account?{" "}
            <a href={`/${parish.slug}/login`} className="auth-desk__link">
              Sign in
            </a>
          </p>
        </form>
      )}

      {step === "code" && (
        <OtpStep email={email} onVerify={checkCode} onResend={() => startSignup(email, parish.id)} />
      )}

      {step === "about" && (
        <form onSubmit={saveAbout} className="auth-desk flex w-full flex-col gap-8 text-left">
          <div>
            <h1 className="auth-desk__title">About you</h1>
            <p className="auth-desk__subtitle">Use your name as it appears on your church records.</p>
          </div>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="signup-first-name" className="auth-desk__label">
                  First name
                </label>
                <input
                  id="signup-first-name"
                  className="auth-desk__input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="signup-last-name" className="auth-desk__label">
                  Last name
                </label>
                <input
                  id="signup-last-name"
                  className="auth-desk__input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-middle-name" className="auth-desk__label">
                Middle name <span className="font-normal text-[var(--auth-ink-faint)]">(optional)</span>
              </label>
              <input
                id="signup-middle-name"
                className="auth-desk__input"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                autoComplete="additional-name"
              />
            </div>
            <div>
              <label htmlFor="signup-birthday" className="auth-desk__label">
                Birthday
              </label>
              <input
                id="signup-birthday"
                type="date"
                className="auth-desk__input"
                value={birthday}
                max={today()}
                min="1900-01-01"
                onChange={(e) => setBirthday(e.target.value)}
                required
                autoComplete="bday"
                aria-describedby="signup-birthday-hint"
              />
              <p id="signup-birthday-hint" className="mt-1.5 text-[0.8rem] text-[var(--auth-ink-faint)]">
                We use this to check your age and to find your own records when you request a certificate.
              </p>
            </div>
          </div>
          {errorLine}
          <button type="submit" className="auth-desk__cta">
            Continue
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={createAccount} className="auth-desk flex w-full flex-col gap-8 text-left">
          <div>
            <h1 className="auth-desk__title">Choose a password</h1>
            <p className="auth-desk__subtitle">
              You&apos;ll sign in with <span className="font-semibold text-[var(--auth-ink)]">{email}</span> and this password.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <div>
              <AuthPasswordField
                id="signup-password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={200}
                disabled={loading}
                autoComplete="new-password"
                autoFocus
              />
              <p className="mt-1.5 text-[0.8rem] text-[var(--auth-ink-faint)]">At least 8 characters.</p>
            </div>
            <div>
              <AuthPasswordField
                id="signup-confirm-password"
                label="Confirm password"
                placeholder="Type the same password again"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
                aria-describedby="signup-confirm-status"
              />
              {confirmPassword && (
                <p
                  id="signup-confirm-status"
                  aria-live="polite"
                  className={`mt-1.5 text-[0.8rem] font-medium ${
                    confirmPassword === password ? "text-[var(--auth-green)]" : "text-[var(--auth-ink-soft)]"
                  }`}
                >
                  {confirmPassword === password ? "✓ Passwords match" : "Doesn't match yet"}
                </p>
              )}
            </div>
          </div>
          {errorLine}
          <button type="submit" className="auth-desk__cta" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      {step === "done" && <VerificationSuccessStep />}
    </AuthShell>
  );
}
