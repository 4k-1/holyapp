import type { ReactNode } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminBackLink } from "@/features/parish-admin/components/AdminBackLink";

export type RecordDetailTone = "gold" | "green" | "blue" | "rose" | "amber" | "neutral";

const TONE_STYLES: Record<
  RecordDetailTone,
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

export function RecordDetailSection({
  tone = "neutral",
  icon,
  title,
  right,
  children,
  className = "",
}: {
  tone?: RecordDetailTone;
  icon: ReactNode;
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];
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
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children}
    </AdminCard>
  );
}

export function RecordDetailInfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-[10.5px] ${
        last ? "" : "border-b border-admin-border"
      }`}
    >
      <span className="shrink-0 text-admin-label text-admin-ink-muted">{label}</span>
      <span className="text-right text-admin-body font-semibold text-admin-ink">{value}</span>
    </div>
  );
}

/** Kept for the record and ledger pages; the same "‹ Back" as every admin page. */
export function RecordDetailBackLink() {
  return <AdminBackLink />;
}

export function RecordDetailMeta({
  encodedBy,
  created,
  updated,
}: {
  encodedBy: string;
  created: string;
  updated: string;
}) {
  const same = created === updated;
  return (
    <p className="mt-4 text-admin-label leading-relaxed text-admin-ink-faint">
      Encoded by {encodedBy}
      {same ? ` · ${created}` : ` · Created ${created} · Updated ${updated}`}
    </p>
  );
}
