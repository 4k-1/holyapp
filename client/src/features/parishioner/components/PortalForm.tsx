import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/** Shared building blocks for parishioner portal forms (giving, Mass intentions), so they read as one system. */

export function PortalFormPage({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>
      <h1 className="font-serif text-[1.75rem] font-bold leading-tight text-ink">{title}</h1>
      <p className="mb-6 mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{description}</p>
      {children}
    </div>
  );
}

export function PortalFormCard({ children }: { children: ReactNode }) {
  return (
    <div data-pf="card" className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(20,24,26,0.04),0_8px_24px_rgba(20,24,26,0.05)]">
      {children}
    </div>
  );
}

export function PortalFormSection({
  step,
  title,
  hint,
  children,
}: {
  step?: number;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section data-pf="section" className="px-5 py-5 sm:px-6">
      <h2 className="flex items-center gap-2.5 text-[0.9375rem] font-semibold text-ink">
        {step !== undefined && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            {step}
          </span>
        )}
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function tileClasses(selected: boolean) {
  return `rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
    selected
      ? "border-primary bg-primary/[0.05] shadow-[inset_0_0_0_1px_var(--color-primary)]"
      : "border-border bg-surface hover:border-primary/40 hover:bg-surface-alt/60"
  }`;
}

/** A pressable option: preset amounts, Mass times. */
export function ChoiceButton({
  selected,
  onClick,
  className = "",
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" data-pf="choice" onClick={onClick} aria-pressed={selected} className={`${tileClasses(selected)} ${className}`}>
      {children}
    </button>
  );
}

/** A radio presented as a card, for one-of-many choices with a short description. */
export function RadioCard({
  name,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
}) {
  return (
    <label className={`flex min-h-[52px] cursor-pointer items-center gap-3 px-4 py-3 ${tileClasses(checked)}`}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        {description && <span className="block text-[0.8125rem] text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Text shown inside the field before the value, e.g. "₱". */
  prefix?: string;
}

export function TextField({ id, label, hint, error, prefix, className = "", ...props }: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">
            {prefix}
          </span>
        )}
        <input
          id={id}
          data-pf="input"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-xl border bg-surface text-[0.9375rem] text-ink placeholder:text-ink-muted/80 focus:outline-none focus:ring-2 ${
            prefix ? "pl-8 pr-3.5" : "px-3.5"
          } ${error ? "border-danger focus:ring-danger/30" : "border-border focus:border-primary focus:ring-primary/20"}`}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Preset amounts plus a free amount field. `value` is the amount as typed, in pesos. */
export function AmountPicker({
  id,
  presets,
  value,
  onChange,
  error,
}: {
  id: string;
  presets: number[];
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {presets.map((preset) => (
          <ChoiceButton
            key={preset}
            selected={value === String(preset)}
            onClick={() => onChange(String(preset))}
            className="min-h-[48px] text-[0.9375rem] font-semibold tabular-nums text-ink"
          >
            ₱{preset.toLocaleString("en-PH")}
          </ChoiceButton>
        ))}
      </div>
      <TextField
        id={id}
        className="mt-3"
        label="Or enter an amount"
        prefix="₱"
        inputMode="numeric"
        placeholder="Any amount"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        error={error}
      />
    </div>
  );
}

export function PortalNotice({ tone, children }: { tone: "success" | "info" | "error"; children: ReactNode }) {
  const styles = {
    success: "border-primary/25 bg-primary/[0.06] text-ink",
    info: "border-border bg-surface-alt text-ink",
    error: "border-danger/30 bg-danger/[0.06] text-danger",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function PrimarySubmit({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-pf="submit"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary px-5 text-[0.9375rem] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Shown while the server checks a payment with GCash after the parishioner returns. */
export function PortalPending({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      data-pf="card"
      className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-sm"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm text-ink-muted">{children}</p>
    </div>
  );
}

const REDIRECT_SECONDS = 5;

/** Replaces a finished form: a thank-you message, then an automatic return to the dashboard. */
export function PortalSuccess({
  title,
  children,
  to,
  destination = "your dashboard",
}: {
  title: string;
  children: ReactNode;
  to: string;
  /** How the place it returns to is named, e.g. "your dashboard". */
  destination?: string;
}) {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      navigate(to, { replace: true });
      return;
    }
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, navigate, to]);

  return (
    <div
      role="status"
      data-pf="card"
      className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[0_1px_2px_rgba(20,24,26,0.04),0_8px_24px_rgba(20,24,26,0.05)]"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7">
          <polyline points="5 12.5 10 17.5 19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h2 className="mt-5 font-serif text-[1.375rem] font-bold text-ink">{title}</h2>
      <div className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">{children}</div>
      <p className="mt-6 text-[0.8125rem] text-ink-muted" aria-live="polite">
        Taking you to {destination} in {Math.max(seconds, 0)}…
      </p>
      <button
        type="button"
        onClick={() => navigate(to, { replace: true })}
        className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        Go now
      </button>
    </div>
  );
}
