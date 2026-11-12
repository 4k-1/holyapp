import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

/** Building blocks for the certificate request steps: readable labels, errors under the field, card choices. */

const inputBase =
  "h-12 w-full rounded-xl border bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-[3px]";

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
        {optional && <span className="ml-1 font-normal text-ink-muted">(optional)</span>}
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

export function GroupHeading({ title, optional, hint }: { title: string; optional?: boolean; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-sans text-[1rem] font-semibold text-ink">
        {title}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">(optional)</span>}
      </h3>
      {hint && <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{hint}</p>}
    </div>
  );
}
