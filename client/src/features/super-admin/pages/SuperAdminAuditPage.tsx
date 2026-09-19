import { useMemo, useState, type ReactNode } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listPlatformAuditLog, listPlatformParishes } from "@/features/super-admin/api/superAdminApi";
import { auditCopy, auditTone, formatAuditWhen } from "@/features/super-admin/auditCopy";
import { ChevronDownIcon } from "@/components/ui/icons/AdminIcons";

type Activity = "all" | "green" | "yellow" | "red";

const ACTIVITY: { id: Activity; label: string }[] = [
  { id: "all", label: "All Activity" },
  { id: "green", label: "Approvals & Setup" },
  { id: "yellow", label: "Flags" },
  { id: "red", label: "Suspensions" },
];

export function SuperAdminAuditPage() {
  const { data: audit = [], loading } = useAsync(() => listPlatformAuditLog(), []);
  const { data: parishes = [] } = useAsync(() => listPlatformParishes(), []);
  const [parishFilter, setParishFilter] = useState("all");
  const [activity, setActivity] = useState<Activity>("all");
  const [open, setOpen] = useState<"parish" | "activity" | null>(null);

  const filtered = useMemo(() => {
    return audit.filter((entry) => {
      if (parishFilter !== "all" && entry.parishId !== parishFilter) return false;
      if (activity !== "all" && auditTone(entry.action) !== activity) return false;
      return true;
    });
  }, [audit, parishFilter, activity]);

  const parishLabel =
    parishFilter === "all"
      ? "All Parishes"
      : (parishes.find((p) => p.parish.id === parishFilter)?.parish.name ?? "All Parishes");
  const activityLabel = ACTIVITY.find((a) => a.id === activity)?.label ?? "All Activity";

  return (
    <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-[18px] py-4">
        <div>
          <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">System Audit Log</h2>
          <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">
            Cross-parish activity, for RA 10173 compliance review
          </p>
        </div>
        <div className="flex gap-2.5">
          <FilterChip
            open={open === "parish"}
            label={parishLabel}
            onToggle={() => setOpen((v) => (v === "parish" ? null : "parish"))}
          >
            <button type="button" className={menuRow} onClick={() => { setParishFilter("all"); setOpen(null); }}>
              All Parishes
            </button>
            {parishes.map((row) => (
              <button
                key={row.parish.id}
                type="button"
                className={menuRow}
                onClick={() => {
                  setParishFilter(row.parish.id);
                  setOpen(null);
                }}
              >
                {row.parish.name}
              </button>
            ))}
          </FilterChip>
          <FilterChip
            open={open === "activity"}
            label={activityLabel}
            onToggle={() => setOpen((v) => (v === "activity" ? null : "activity"))}
          >
            {ACTIVITY.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={menuRow}
                onClick={() => {
                  setActivity(opt.id);
                  setOpen(null);
                }}
              >
                {opt.label}
              </button>
            ))}
          </FilterChip>
        </div>
      </div>

      {loading ? (
        <p className="px-[18px] py-8 text-center text-[12.5px] text-admin-ink-faint">Loading audit log…</p>
      ) : filtered.length === 0 ? (
        <p className="px-[18px] py-8 text-center text-[12.5px] text-admin-ink-faint">No matching entries.</p>
      ) : (
        <ul>
          {filtered.map((entry) => {
            const tone = auditTone(entry.action);
            const dot =
              tone === "red" ? "bg-admin-red-700" : tone === "yellow" ? "bg-admin-gold-600" : "bg-admin-green-700";
            return (
              <li key={entry.id} className="flex items-start gap-2.5 border-b border-admin-border px-[18px] py-3 last:border-b-0">
                <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <div className="min-w-0">
                  <p className="text-[12.3px] leading-snug text-admin-ink">{auditCopy(entry)}</p>
                  <p className="mt-0.5 text-[10.8px] text-admin-ink-faint">{formatAuditWhen(entry.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const menuRow =
  "block w-full px-3 py-2 text-left text-[12.3px] text-admin-ink-muted hover:bg-admin-green-100 hover:text-admin-green-900";

function FilterChip({
  open,
  label,
  onToggle,
  children,
}: {
  open: boolean;
  label: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border bg-white px-3 py-[7px] text-[12.5px] text-admin-ink-muted"
      >
        <ChevronDownIcon className="h-[11px] w-[11px]" />
        <span className="max-w-[180px] truncate">{label}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-1 min-w-[150px] overflow-hidden rounded-lg border border-admin-border bg-white shadow-[0_8px_24px_rgba(20,30,25,0.10)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
