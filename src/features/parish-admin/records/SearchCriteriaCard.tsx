import type { ReactNode } from "react";
import "@/features/parish-admin/styles/adminDesk.css";

export function SearchCriteriaCard({ children }: { children: ReactNode }) {
  return (
    <section className="admin-dash mb-[18px]">
      <div className="admin-dash__card overflow-hidden bg-white">
        <div className="border-b border-[var(--dash-border)] bg-white px-5 py-2.5">
          <h2 className="text-[0.78rem] font-semibold text-[var(--dash-ink)]">Search criteria</h2>
        </div>
        <div className="bg-white p-5 px-[22px]">{children}</div>
      </div>
    </section>
  );
}
