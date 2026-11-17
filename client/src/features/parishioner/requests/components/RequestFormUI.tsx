import type { FocusEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

/** Building blocks for the certificate request steps: readable labels, errors under the field, card choices. */

const inputBase =
  "h-12 w-full rounded-xl border bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-[3px]";

/** The red * after a required field's label; screen readers hear "required" instead. */
export function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-danger">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

function inputTone(error?: string) {
  return error ? "border-danger focus:ring-danger/20" : "border-border focus:border-primary focus:ring-primary/20";
}

export function FieldLabel({
  htmlFor,
  label,
  optional,
  hint,
}: {
  htmlFor?: string;
  label: string;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="block text-[0.875rem] font-semibold text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-muted">(optional)</span> : <RequiredMark />}
      </label>
      {hint && <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{hint}</p>}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-danger">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM10 14.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
}

export function TextField({ id, label, optional, hint, error, className = "", ...props }: TextFieldProps) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} optional={optional} hint={hint} />
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputBase} ${inputTone(error)}`}
        {...props}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-21" → ["2026", "11", "21"]; a half-typed "2026--2" keeps its blanks. */
function dateParts(value: string): [string, string, string] {
  const [year = "", month = "", day = ""] = value.split("-");
  return [year, month, day];
}

/**
 * A date as Month / Day / Year, always in that order. The browser's own date
 * box follows the phone's region, so on some phones it reads day/month/year and
 * "11 21 2026" lands 21 in the month slot. The value is "YYYY-MM-DD" once
 * complete; while half-filled it keeps its blanks (e.g. "2026-11-") so the step
 * can ask for the rest, and it is "" when every part is empty.
 */
export function DateField({
  id,
  label,
  optional,
  hint,
  error,
  value,
  onChange,
  onBlur,
  className = "",
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}) {
  const [year, month, day] = dateParts(value);
  const describedBy = error ? `${id}-error` : undefined;

  function emit(next: { year?: string; month?: string; day?: string }) {
    const y = next.year ?? year;
    const m = next.month ?? month;
    const d = next.day ?? day;
    onChange(y || m || d ? `${y}-${m}-${d}` : "");
  }

  // Errors show once focus leaves all three boxes, not while moving between them.
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    onBlur?.();
  }

  const box = `${inputBase} ${inputTone(error)}`;
  return (
    <fieldset className={className} aria-describedby={describedBy}>
      <legend className="contents">
        <FieldLabel label={label} optional={optional} hint={hint} />
      </legend>
      <div className="grid grid-cols-[minmax(0,1fr)_4.25rem_5.25rem] gap-2" onBlur={handleBlur}>
        <select
          id={id}
          aria-label={`${label}: month`}
          aria-invalid={Boolean(error)}
          className={`${box} ${month ? "" : "text-ink-muted/70"}`}
          value={month}
          onChange={(e) => emit({ month: e.target.value })}
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, "0")} className="text-ink">
              {name}
            </option>
          ))}
        </select>
        <input
          aria-label={`${label}: day`}
          aria-invalid={Boolean(error)}
          className={box}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Day"
          maxLength={2}
          value={day}
          onChange={(e) => emit({ day: e.target.value.replace(/\D/g, "").slice(0, 2) })}
          // "5" becomes "05" when the day box is left, so the value reads as a full date.
          onBlur={() => {
            if (/^\d$/.test(day)) emit({ day: day.padStart(2, "0") });
          }}
        />
        <input
          aria-label={`${label}: year`}
          aria-invalid={Boolean(error)}
          className={box}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Year"
          maxLength={4}
          value={year}
          onChange={(e) => emit({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  options: string[];
  placeholder: string;
}

export function SelectField({ id, label, error, options, placeholder, className = "", ...props }: SelectFieldProps) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} />
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputBase} ${inputTone(error)}`}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** A group of card choices that behaves as one radio group. */
export function ChoiceGroup({
  id,
  legend,
  error,
  className,
  children,
}: {
  id: string;
  legend: string;
  error?: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div id={id} role="radiogroup" aria-label={legend} className={className}>
        {children}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}

export function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  invalid,
  layout = "row",
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  invalid?: boolean;
  layout?: "row" | "tile";
}) {
  const tile = layout === "tile";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 ${
        tile ? "flex-col items-center px-3 py-5 text-center" : "items-start"
      } ${
        selected
          ? "border-primary bg-primary/[0.06] shadow-[inset_0_0_0_1px_var(--color-primary)]"
          : `${invalid ? "border-danger/60" : "border-border"} bg-surface hover:border-primary/45 hover:bg-surface-alt/60`
      }`}
    >
      {icon && (
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
            selected ? "bg-primary text-white" : "bg-primary/[0.08] text-primary"
          }`}
        >
          {icon}
        </span>
      )}
      {!icon && (
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-primary" : "border-border"
          }`}
          aria-hidden="true"
        >
          {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">{description}</span>}
      </span>
    </button>
  );
}

export function PillChoice({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`min-h-[44px] rounded-full border px-4 text-[0.9375rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 ${
        selected ? "border-primary bg-primary text-white" : "border-border bg-surface text-ink hover:border-primary/45"
      }`}
    >
      {children}
    </button>
  );
}

/** `required` marks a heading that is itself a question, such as a set of choices that must be answered. */
export function GroupHeading({
  title,
  optional,
  required,
  hint,
}: {
  title: string;
  optional?: boolean;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="font-sans text-[1rem] font-semibold text-ink">
        {title}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">(optional)</span>}
        {required && <RequiredMark />}
      </h3>
      {hint && <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{hint}</p>}
    </div>
  );
}
