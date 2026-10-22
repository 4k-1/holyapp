import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  SVGProps,
  TextareaHTMLAttributes,
} from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";

const fieldInputClass =
  "w-full rounded-[10px] border border-admin-border-strong bg-white px-3.5 py-[11px] text-[0.84375rem] leading-normal text-admin-ink placeholder:text-admin-ink-faint transition-[border-color,box-shadow] focus:border-admin-green-700 focus:outline-none focus:ring-2 focus:ring-admin-green-700/15";

const fieldSelectClass = `${fieldInputClass} appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9`;

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M6 8l4 4 4-4' stroke='%238a9a9e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export function AdminFormPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-[760px] ${className}`}>{children}</div>;
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
      <label className="mb-1.5 block text-[0.8125rem] font-semibold leading-snug text-admin-ink">
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
  return <textarea className={`${fieldInputClass} min-h-[100px] resize-y ${className}`} {...props} />;
}

export function AdminSelect({
  className = "",
  style,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`${fieldSelectClass} ${className}`}
      style={{ backgroundImage: SELECT_CHEVRON, ...style }}
      {...props}
    />
  );
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
  primary: "border-transparent bg-admin-green-700 text-white hover:bg-admin-green-600",
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
 * A labeled sub-grouping of closely related fields inside an AdminFormSection
 * (e.g. "Father" first/last name). Uses a responsive grid — no fixed-width chips.
 */
export function AdminFieldGroup({
  title,
  right,
  children,
  className = "",
  cols = 2,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Column count from `sm` breakpoint up. */
  cols?: 1 | 2 | 3;
}) {
  const gridCols =
    cols === 1
      ? "grid-cols-1"
      : cols === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={`mb-5 last:mb-0 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <p className="text-[0.75rem] font-medium tracking-[0.01em] text-admin-ink-muted">{title}</p>
          )}
          {right}
        </div>
      )}
      <div className={`grid items-start ${gridCols} gap-x-4 gap-y-4`}>{children}</div>
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

export function PrintIcon({ className = "h-3.5 w-3.5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      {...props}
    >
      <path d="M6 9V3h12v6" strokeLinejoin="round" />
      <rect x="6" y="13" width="12" height="8" rx="1" />
      <path
        d="M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FileIcon({ className = "h-3.5 w-3.5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      {...props}
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 3 14 8 19 8" strokeLinejoin="round" />
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
