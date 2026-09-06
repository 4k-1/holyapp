import { useState, type FormEvent } from "react";
import { ParishIdentityLockup } from "@/features/auth/components/ParishIdentityLockup";
import type { Parish } from "@/types";
import type { RegisterInput } from "@/features/auth/api/authApi";
import "@/features/auth/styles/authDesk.css";

interface RegisterFormProps {
  parish: Parish;
  onSubmit: (data: RegisterInput) => Promise<void>;
}

export function RegisterForm({ parish, onSubmit }: RegisterFormProps) {
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
        address,
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
    <form onSubmit={handleSubmit} className="auth-desk flex w-full flex-col gap-6 text-left">
      <ParishIdentityLockup parish={parish} eyebrow="Registering with" />

      <div>
        <h1 className="auth-desk__title">Create account</h1>
        <p className="auth-desk__subtitle">Register as a parishioner of this parish.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
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

        <div>
          <label htmlFor="reg-address" className="auth-desk__label">
            Address
          </label>
          <input
            id="reg-address"
            className="auth-desk__input"
            placeholder="Home address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            disabled={loading}
            autoComplete="street-address"
          />
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-password" className="auth-desk__label">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              className="auth-desk__input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="reg-confirm-password" className="auth-desk__label">
              Confirm
            </label>
            <input
              id="reg-confirm-password"
              type="password"
              className="auth-desk__input"
              placeholder="Confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="auth-desk__error">
          {error}
        </p>
      )}

      <button type="submit" className="auth-desk__cta" disabled={loading}>
        {loading ? "Sending code…" : "Continue"}
      </button>

      <p className="border-t border-[var(--auth-border)] pt-5 text-center text-[0.84375rem] text-[var(--auth-ink-soft)]">
        Already have an account?{" "}
        <a href={`/${parish.slug}/login`} className="auth-desk__link">
          Sign in
        </a>
      </p>
    </form>
  );
}
