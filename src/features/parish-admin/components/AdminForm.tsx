import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SVGProps,
  TextareaHTMLAttributes,
} from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";

const fieldInputClass =
  "w-full rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

export function AdminFormPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-[720px] ${className}`}>{children}</div>;
}

export function AdminField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AdminTextarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldInputClass} min-h-[88px] resize-y ${className}`} {...props} />;
}

export function AdminInput({
  className = "",
  type,
  max,
  onChange,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const isDate = type === "date";

  return (
    <input
      type={type}
      max={isDate ? max ?? "9999-12-31" : max}
      className={`${fieldInputClass} ${className}`}
      onChange={(e) => {
        if (isDate) {
          const year = e.target.value.split("-")[0] ?? "";
          if (year.length > 4) return;
        }
        onChange?.(e);
      }}
      {...props}
    />
  );
}

type AdminBtnVariant = "primary" | "secondary" | "danger" | "ghost";

const btnVariants: Record<AdminBtnVariant, string> = {
  primary: "border-transparent bg-admin-green-700 text-white hover:bg-admin-green-900",
  secondary: "border-admin-border-strong bg-admin-surface text-admin-ink hover:bg-admin-surface-alt",
  danger: "border-[#E3C3BC] bg-admin-surface text-admin-red-700 hover:bg-admin-red-100",
  ghost: "border-transparent bg-transparent px-1.5 text-admin-green-700 hover:underline",
};

export type AdminSectionTone = "gold" | "green" | "blue" | "rose" | "amber" | "neutral";

const SECTION_TONE_STYLES: Record<
  AdminSectionTone,
  { headerBg: string; iconBg: string; iconText: string }
> = {
  gold: {
    headerBg: "bg-admin-gold-100/40",
    iconBg: "bg-admin-gold-100",
    iconText: "text-admin-gold-700",
  },
  green: {
    headerBg: "bg-admin-green-050",
    iconBg: "bg-admin-green-100",
    iconText: "text-admin-green-700",
  },
  blue: {
    headerBg: "bg-[#EAF2FB]",
    iconBg: "bg-[#D6EAF8]",
    iconText: "text-[#2F6FA8]",
  },
  rose: {
    headerBg: "bg-[#FBEFF3]",
    iconBg: "bg-[#F8D6E0]",
    iconText: "text-[#B85A75]",
  },
  amber: {
    headerBg: "bg-admin-amber-100/40",
    iconBg: "bg-admin-amber-100",
    iconText: "text-admin-amber-700",
  },
  neutral: {
    headerBg: "bg-admin-surface-alt",
    iconBg: "bg-admin-surface",
    iconText: "text-admin-ink-muted",
  },
};

/**
 * A visually distinct, self-contained group of related form fields — a
 * colored icon + title band on top of a card, with the fields inside.
 * Use one section per logical grouping (e.g. "Personal information",
 * "Parents") instead of a plain uppercase label inline in a bigger card.
 */
export function AdminFormSection({
  icon,
  tone = "neutral",
  title,
  description,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  icon: ReactNode;
  tone?: AdminSectionTone;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const styles = SECTION_TONE_STYLES[tone];
  return (
    <AdminCard className={`mb-4 overflow-hidden p-0 ${className}`}>
      <div className={`flex items-center gap-2.5 border-b border-admin-border px-5 py-2.5 ${styles.headerBg}`}>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-admin-group font-semibold leading-tight text-admin-ink">{title}</h2>
          {description && <p className="mt-0.5 text-admin-support text-admin-ink-muted">{description}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      <div className={`p-5 px-[22px] ${bodyClassName}`}>{children}</div>
    </AdminCard>
  );
}

/**
 * A boxed sub-grouping of closely related fields inside an AdminFormSection
 * (e.g. "Father" first/last name, or a repeatable "Witness" entry).
 */
export function AdminFieldGroup({
  title,
  right,
  children,
  className = "",
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 rounded-[10px] border border-admin-border bg-admin-surface-alt/60 p-3.5 last:mb-0 ${className}`}>
      {(title || right) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {title && (
            <p className="text-admin-label font-bold uppercase tracking-admin-label text-admin-gold-700">{title}</p>
          )}
          {right}
        </div>
      )}
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-3.6 3.4-6.2 7.5-6.2s7.5 2.6 7.5 6.2" strokeLinecap="round" />
    </svg>
  );
}

export function FamilyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="8" cy="7" r="2.6" />
      <circle cx="16" cy="7" r="2.6" />
      <path d="M2.5 19c0-2.8 2.5-4.8 5.5-4.8s5.5 2 5.5 4.8" strokeLinecap="round" />
      <path d="M10.5 19c0-2.8 2.5-4.8 5.5-4.8s5.5 2 5.5 4.8" strokeLinecap="round" />
    </svg>
  );
}

export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" strokeLinejoin="round" />
      <path d="M4 5.5v16" strokeLinecap="round" />
      <line x1="8" y1="7.5" x2="16" y2="7.5" strokeLinecap="round" />
      <line x1="8" y1="11" x2="16" y2="11" strokeLinecap="round" />
    </svg>
  );
}

export function ChecklistIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M7.5 12.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7.5" y1="17" x2="16.5" y2="17" strokeLinecap="round" />
    </svg>
  );
}

export function NoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M15 3v5h5" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round" />
      <line x1="8" y1="17" x2="13" y2="17" strokeLinecap="round" />
    </svg>
  );
}

export function AdminButton({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminBtnVariant;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  const sizeClass = size === "sm" ? "px-[11px] py-1.5 text-admin-support" : "px-4 py-[9px] text-admin-body";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${btnVariants[variant]} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
