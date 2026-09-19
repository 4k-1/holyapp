import type { ReactNode } from "react";

type BadgeTone = "amber" | "green" | "red" | "gold" | "muted" | "blue" | "slate";

interface AdminBadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  amber: "bg-admin-amber-100 text-admin-amber-700",
  green: "bg-admin-green-100 text-admin-green-700",
  red: "bg-admin-red-100 text-admin-red-700",
  gold: "bg-admin-gold-100 text-admin-gold-700",
  muted: "bg-admin-surface-alt text-admin-ink-muted",
  blue: "bg-[#E3E9F5] text-[#3B4E8A]",
  slate: "bg-[#EEF1F2] text-[#3D4F53]",
};

export function AdminBadge({ tone, children }: AdminBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-admin-label font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}