import { useState, type FormEvent } from "react";
import { AuthPasswordField } from "@/features/auth/components/AuthPasswordField";
import type { Parish } from "@/types";
import type { RegisterInput } from "@/features/auth/api/authApi";
import "@/features/auth/styles/authDesk.css";

interface RegisterFormProps {
  parish: Parish;
  /** Page 1 asks about the person; page 2 sets up the sign-in (email and password, one under the other
   *  so they're easy to check on a phone). Fields keep their values between pages. */
  part: 1 | 2;
  onNext: () => void;
  onSubmit: (data: RegisterInput) => Promise<void>;
}

export function RegisterForm({ parish, part, onNext, onSubmit }: RegisterFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (part === 1) {
      onNext();
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        firstName,
        lastName,
        middleName: middleName || undefined,
        birthday,
        address: address.trim() || undefined,
        email,
        password,
        parishId: parish.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-desk flex w-full flex-col gap-8 text-left">

      <div>
        <p className="auth-desk__step">Step {part} of 2</p>
        <h1 className="auth-desk__title">{part === 1 ? "Create your account" : "Set up your sign-in"}</h1>
        <p className="auth-desk__subtitle">
          {part === 1
            ? "Tell us a little about yourself."
            : "We'll send a code to this email to confirm it's yours."}
        </p>
      </div>

      {part === 1 && (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-first-name" className="auth-desk__label">
              First name
            </label>
            <input
              id="reg-first-name"
              className="auth-desk__input"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={loading}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label htmlFor="reg-last-name" className="auth-desk__label">
              Last name
            </label>
            <input
              id="reg-last-name"
              className="auth-desk__input"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={loading}
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="reg-middle-name" className="auth-desk__label">
            Middle name <span className="font-normal text-[var(--auth-ink-faint)]">(optional)</span>
          </label>
          <input
            id="reg-middle-name"
            className="auth-desk__input"
            placeholder="Middle name"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            disabled={loading}
            autoComplete="additional-name"
          />
        </div>

        <div>
          <label htmlFor="reg-birthday" className="auth-desk__label">
            Birthday
          </label>
          <input
            id="reg-birthday"
            type="date"
            className="auth-desk__input"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
            disabled={loading}
            autoComplete="bday"
          />
        </div>
        </div>

        <div>
          <label htmlFor="reg-address" className="auth-desk__label">
            Address <span className="font-normal text-[var(--auth-ink-faint)]">(optional)</span>
          </label>
          <input
            id="reg-address"
            className="auth-desk__input"
            placeholder="Home address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
            autoComplete="street-address"
          />
        </div>
      </div>
      )}

      {part === 2 && (
      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="reg-email" className="auth-desk__label">
            Email
          </label>
          <input
            id="reg-email"
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
          <AuthPasswordField
            id="reg-password"
            label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            autoComplete="new-password"
          />
          <p className="mt-1.5 text-[0.8rem] text-[var(--auth-ink-faint)]">At least 8 characters.</p>
        </div>

        <div>
          <AuthPasswordField
            id="reg-confirm-password"
            label="Confirm password"
            placeholder="Type the same password again"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            aria-describedby="reg-confirm-status"
          />
          {confirmPassword && (
            <p
              id="reg-confirm-status"
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
      )}

      {error && (
        <p role="alert" className="auth-desk__error">
          {error}
        </p>
      )}

      <button type="submit" className="auth-desk__cta" disabled={loading}>
        {part === 1 ? "Continue" : loading ? "Sending code…" : "Create account"}
      </button>

      <p className="text-center text-[0.875rem] text-[var(--auth-ink-soft)]">
        Already have an account?{" "}
        <a href={`/${parish.slug}/login`} className="auth-desk__link">
          Sign in
        </a>
      </p>
    </form>
  );
}
