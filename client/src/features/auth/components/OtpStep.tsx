import { useRef, useState, type KeyboardEvent } from "react";
import "@/features/auth/styles/authDesk.css";

interface OtpStepProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => void | Promise<void>;
}

export function OtpStep({ email, onVerify, onResend }: OtpStepProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    setError(null);
    const code = digits.join("");
    if (code.length !== 4) {
      setError("Enter the full 4-digit code.");
      return;
    }
    setLoading(true);
    try {
      await onVerify(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-desk flex w-full flex-col gap-6 text-left">
      <div>
        <h1 className="auth-desk__title">Enter verification code</h1>
        <p className="auth-desk__subtitle">
          We sent a code to <span className="font-semibold text-[var(--auth-ink)]">{email}</span>
        </p>
      </div>

      <div className="flex justify-between gap-2 sm:gap-3">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="auth-desk__input h-14 w-full max-w-[4.25rem] px-0 text-center text-xl font-semibold"
            disabled={loading}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <p className="text-[0.84375rem] text-[var(--auth-ink-soft)]">
        Didn&apos;t receive a code?{" "}
        <button
          type="button"
          className="auth-desk__link"
          onClick={() => {
            void (async () => {
              try {
                setError(null);
                await onResend();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not resend code.");
              }
            })();
          }}
        >
          Resend
        </button>
      </p>

      {error && (
        <p role="alert" className="auth-desk__error">
          {error}
        </p>
      )}

      <button type="button" className="auth-desk__cta" onClick={handleVerify} disabled={loading}>
        {loading ? "Verifying…" : "Verify"}
      </button>
    </div>
  );
}
