import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Parish } from "@/types";
import type { RegisterInput } from "@/features/auth/api/authApi";

interface RegisterFormProps {
  parish: Parish;
  onBack: () => void;
  onSubmit: (data: RegisterInput) => Promise<void>;
}

export function RegisterForm({ parish, onBack, onSubmit }: RegisterFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [gender, setGender] = useState("");
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
        gender,
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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 p-2 h-full">
      <button
        type="button"
        onClick={onBack}
        className="w-fit text-sm text-ink-muted hover:text-ink"
      >
        ← Change parish
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

      <h1 className="font-serif text-2xl font-semibold text-ink">Register</h1>

      <div className="grid grid-cols-2 gap-3">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>

      <Input
        label="Middle name (optional)"
        value={middleName}
        onChange={(e) => setMiddleName(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} required />
        <Input
          label="Birthday"
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          required
        />
      </div>

      <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
      <Input type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <div className="grid grid-cols-2 gap-3">
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          label="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Sending code..." : "Register"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <a href={`/login?parish=${parish.slug}`} className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}