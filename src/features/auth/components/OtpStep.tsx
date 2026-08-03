import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";

interface OtpStepProps {
  email: string;
  onBack: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: () => void;
}

export function OtpStep({ email, onBack, onVerify, onResend }: OtpStepProps) {
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
    <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <div>
        <button type="button" onClick={onBack} className="mb-4 self-start text-sm text-ink-muted hover:text-ink">
          ← Back
        </button>
        <h1 className="font-serif text-2xl font-semibold text-ink">Enter verification code</h1>
        <p className="text-sm text-ink-muted">
          We've sent a code to <span className="font-medium text-ink">{email}</span>
        </p>
      </div>

      <div className="flex gap-3">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-16 w-16 rounded-md border border-border bg-surface text-center text-xl text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        ))}
      </div>

      <p className="text-sm text-ink-muted">
        Didn't receive a code?{" "}
        <button type="button" onClick={onResend} className="font-medium text-primary hover:underline">
          Click to resend
        </button>
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex w-full gap-3">
        <Button variant="secondary" className="flex-1" type="button" onClick={onBack}>
          Cancel
        </Button>
        <Button className="flex-1" type="button" onClick={handleVerify} disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </Button>
      </div>
    </div>
  );
}