import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import "@/features/auth/styles/authDesk.css";

interface OtpStepProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => void | Promise<void>;
  /** A line above the usual one, e.g. why this account always gets the second step. */
  intro?: string;
  /** Test mode: the code isn't emailed yet, so it is shown here instead. */
  testCode?: string;
}

export function OtpStep({ email, onVerify, onResend, intro, testCode }: OtpStepProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  /** Puts digits into the boxes from `index` on and moves focus straight away, so fast typing and pasting keep up. */
  function fill(index: number, chars: string[]) {
    if (chars.length === 0) return;
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((c, i) => {
        if (index + i < next.length) next[index + i] = c;
      });
      return next;
    });
    inputsRef.current[Math.min(index + chars.length, 3)]?.focus();
  }

  // Phones' code autofill and other input that skips keydown land here.
  function handleChange(index: number, value: string) {
    if (value === "") {
      setDigits((prev) => prev.map((d, i) => (i === index ? "" : d)));
      return;
    }
    // Typing into a box that already holds a digit gives e.g. "37": keep only what was just added.
    const old = digits[index];
    let added = value;
    if (old && value.length > 1) {
      if (value.startsWith(old)) added = value.slice(old.length);
      else if (value.endsWith(old)) added = value.slice(0, -old.length);
    }
    fill(index, added.replace(/\D/g, "").slice(0, 4).split(""));
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      fill(index, [e.key]);
      return;
    }
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    e.preventDefault();
    fill(index, pasted.split(""));
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
    <div className="auth-desk flex w-full flex-col gap-8 text-left">
      <div>
        <h1 className="auth-desk__title">Enter verification code</h1>
        {intro && <p className="auth-desk__subtitle">{intro}</p>}
        {testCode ? (
          <p className="auth-desk__subtitle">
            The code for <span className="font-semibold text-[var(--auth-ink)]">{email}</span> is below.
          </p>
        ) : (
          <p className="auth-desk__subtitle">
            We sent a code to <span className="font-semibold text-[var(--auth-ink)]">{email}</span>
          </p>
        )}
      </div>

      {testCode && (
        <div
          role="note"
          className="rounded-md border border-dashed border-[var(--auth-border-strong)] bg-[var(--auth-gold-soft)] px-4 py-3 text-[0.84375rem] text-[var(--auth-ink-soft)]"
        >
          <p>
            Test mode: sign-in codes aren&apos;t emailed yet. Your code is{" "}
            <span className="font-mono text-base font-semibold tracking-[0.2em] text-[var(--auth-ink)]">{testCode}</span>
          </p>
        </div>
      )}

      <div className="flex justify-between gap-2 sm:gap-3">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
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
