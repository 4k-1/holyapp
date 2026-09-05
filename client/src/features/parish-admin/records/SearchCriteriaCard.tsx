import type { ReactNode } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";

export function SearchCriteriaCard({ children }: { children: ReactNode }) {
  return (
    <AdminCard className="mb-[18px] overflow-hidden p-0">
      <div className="border-b border-admin-border bg-admin-surface-alt px-5 py-2">
        <h2 className="font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
          Search criteria
        </h2>
      </div>
      <div className="p-5 px-[22px]">{children}</div>
    </AdminCard>
  );
}
