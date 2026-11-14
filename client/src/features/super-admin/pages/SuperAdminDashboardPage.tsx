import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAsync } from "@/hooks/useAsync";
import { getPlatformDashboard, type DashboardSnapshot } from "@/features/super-admin/api/superAdminApi";
import {
  ChurchIcon,
  ClipboardIcon,
  SealIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons/AdminIcons";
import { auditCopy, auditTone, formatAuditWhen } from "@/lib/auditCopy";

const HONORIFICS = new Set(["fr.", "fr", "rev.", "rec.", "staff", "dr.", "dr", "sr.", "sr"]);

function initials(name: string) {
  const all = name.split(/\s+/).filter(Boolean);
  const words = all.filter((w) => !HONORIFICS.has(w.toLowerCase()));
  const clean = words.length ? words : all;
  if (clean.length === 0) return "?";
  if (clean.length === 1) return clean[0][0].toUpperCase();
  return (clean[0][0] + clean[clean.length - 1][0]).toUpperCase();
}

function doughnutStyle(shares: DashboardSnapshot["requestsBySacrament"]) {
  const total = shares.reduce((s, x) => s + x.count, 0) || 1;
  let cursor = 0;
  const stops = shares.map((s) => {
    const start = cursor;
    cursor += (s.count / total) * 360;
    return `${s.color} ${start}deg ${cursor}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-admin-border bg-admin-surface ${className}`}>
      {children}
    </div>
  );
}

export function SuperAdminDashboardPage() {
  const { data, loading, error } = useAsync(() => getPlatformDashboard(), []);

  if (error) {
    return <p className="text-[13.5px] text-admin-red-700">Couldn't load the overview. Refresh the page to try again.</p>;
  }
  if (loading || !data) {
    return <p className="text-[13.5px] text-admin-ink-muted">Loading overview…</p>;
  }

  const recordMax = Math.max(...data.recordsBySacrament.map((s) => s.count), 1);
  const requestTotal = data.requestsBySacrament.reduce((s, x) => s + x.count, 0);

  return (
    <div>
      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Registered Parishes"
          value={data.parishCount}
          sub="on HolyApp"
          tone="flat"
          icon={<ChurchIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Active Parish Admins"
          value={data.activeAdminCount}
          sub={`across ${data.parishesWithAdmin} ${data.parishesWithAdmin === 1 ? "parish" : "parishes"}`}
          tone="flat"
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Setup"
          value={data.pendingSetupCount}
          sub="parishes without an admin yet"
          tone="warn"
          icon={<ChurchIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Parishioner Accounts"
          value={data.parishionerCount}
          sub="across all parishes"
          tone="flat"
          icon={<UserIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Records Digitized"
          value={data.recordTotal}
          sub="system-wide, current books"
          tone="up"
          icon={<ClipboardIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Certificates Issued"
          value={data.certificateTotal}
          sub="from the current registers"
          tone="up"
          icon={<SealIcon className="h-5 w-5" />}
        />
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="p-[18px]">
          <h3 className="font-sans text-[14.5px] font-bold text-admin-ink">Records by sacrament</h3>
          <p className="mt-0.5 mb-3.5 text-[12.5px] text-admin-ink-faint">Counts from the current parish registers</p>
          <div className="flex flex-col gap-3">
            {data.recordsBySacrament.map((row) => (
              <div key={row.key}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="font-medium text-admin-ink-muted">{row.label}</span>
                  <span className="tabular-nums text-admin-ink-muted">{row.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-admin-surface-alt">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(row.count / recordMax) * 100}%`, background: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-[18px]">
          <h3 className="font-sans text-[14.5px] font-bold text-admin-ink">Certificate requests by sacrament</h3>
          <p className="mt-0.5 text-[12.5px] text-admin-ink-faint">Share of open and completed requests</p>
          <div className="mt-5 flex items-center gap-6">
            <div
              className="relative h-[120px] w-[120px] shrink-0 rounded-full"
              style={{ background: doughnutStyle(data.requestsBySacrament) }}
              aria-hidden
            >
              <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-admin-surface">
                <span className="text-lg font-extrabold leading-none text-admin-ink">{requestTotal}</span>
                <span className="mt-0.5 text-[11.5px] text-admin-ink-faint">requests</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2.5">
              {data.requestsBySacrament.map((row) => (
                <li key={row.key} className="flex items-center gap-1.5 text-[13px] text-admin-ink-muted">
                  <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: row.color }} />
                  {row.label} — {requestTotal ? Math.round((row.count / requestTotal) * 100) : 0}%
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between border-b border-admin-border px-[18px] py-4">
            <div>
              <h2 className="font-sans text-[16px] font-bold text-admin-ink">Parishes</h2>
              <p className="mt-0.5 text-[13px] text-admin-ink-faint">Parish accounts on HolyApp</p>
            </div>
            <Link to="/super-admin/parishes" className="text-xs font-bold text-admin-green-700 hover:text-admin-green-900">
              View all
            </Link>
          </div>
          <div className="relative max-h-[330px] overflow-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  {["Parish", "Admin", "Records"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-admin-border bg-admin-surface-alt px-[18px] py-2.5 text-left text-[12.5px] font-semibold text-admin-ink-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.parishes.map((row) => (
                  <tr key={row.parish.id} className="hover:bg-admin-green-100">
                    <td className="border-b border-admin-border px-[18px] py-3">
                      <p className="font-bold text-admin-ink">{row.parish.name}</p>
                      <p className="mt-px text-[12.5px] text-admin-ink-faint">{row.parish.address}</p>
                    </td>
                    <td className="border-b border-admin-border px-[18px] py-3 text-admin-ink">
                      {row.admins[0] ? (
                        <>
                          {row.admins[0].fullName}
                          {row.admins[0].canEditRecords ? null : (
                            <span className="font-semibold text-admin-ink-faint"> (view only)</span>
                          )}
                          {row.admins.length > 1 ? (
                            <span className="text-admin-ink-faint"> +{row.admins.length - 1} more</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-admin-ink-faint">— unassigned —</span>
                      )}
                    </td>
                    <td className="border-b border-admin-border px-[18px] py-3 tabular-nums text-admin-ink">
                      {row.records.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="flex flex-col gap-[18px]">
          <Panel>
            <div className="flex items-center justify-between border-b border-admin-border px-[18px] py-4">
              <h2 className="font-sans text-[16px] font-bold text-admin-ink">Parish Admins</h2>
              <Link to="/super-admin/parishes" className="text-xs font-bold text-admin-green-700 hover:text-admin-green-900">
                Manage all
              </Link>
            </div>
            <ul>
              {data.admins.slice(0, 6).map((row) => (
                <li key={row.user.id} className="flex items-center gap-2.5 border-b border-admin-border px-[18px] py-3 last:border-b-0">
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-admin-green-100 text-[13.5px] font-bold text-admin-green-900">
                    {initials(row.user.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-admin-ink">
                      {row.user.fullName}{" "}
                      <span
                        className={`ml-1.5 inline-block rounded-full px-2 py-0.5 align-middle text-[12px] font-bold ${
                          row.canEditRecords
                            ? "bg-admin-green-100 text-admin-green-900"
                            : "bg-admin-gold-100 text-admin-gold-700"
                        }`}
                      >
                        {row.canEditRecords ? "Can edit" : "View only"}
                      </span>
                    </p>
                    <p className="truncate text-[12.5px] text-admin-ink-faint">{row.parish.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between border-b border-admin-border px-[18px] py-4">
              <h2 className="font-sans text-[16px] font-bold text-admin-ink">System Audit Log</h2>
              <Link to="/super-admin/audit" className="text-xs font-bold text-admin-green-700 hover:text-admin-green-900">
                View all
              </Link>
            </div>
            <ul>
              {data.audit.slice(0, 5).map((entry) => {
                const tone = auditTone(entry.action);
                const dot =
                  tone === "red"
                    ? "bg-admin-red-700"
                    : tone === "yellow"
                      ? "bg-admin-gold-600"
                      : "bg-admin-green-700";
                return (
                  <li key={entry.id} className="flex items-start gap-2.5 border-b border-admin-border px-[18px] py-3 last:border-b-0">
                    <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] leading-snug text-admin-ink">{auditCopy(entry)}</p>
                      <p className="mt-0.5 text-[12px] text-admin-ink-faint">{formatAuditWhen(entry.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <p className="mt-2.5 text-center text-[12.5px] text-admin-ink-faint">
        Every super admin action is recorded in the audit log.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  icon: ReactNode;
  tone: "up" | "flat" | "warn";
}) {
  const iconColor = tone === "warn" ? "text-[#c99400]" : "text-admin-green-700";
  const subColor =
    tone === "warn" ? "text-admin-amber-700" : tone === "up" ? "text-admin-green-700" : "text-admin-ink-faint";

  return (
    <Panel className="px-4 pb-3.5 pt-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-admin-ink-muted">{label}</p>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="text-2xl font-extrabold leading-none text-admin-ink">{value}</p>
      <p className={`mt-1.5 text-[12px] font-semibold ${subColor}`}>{sub}</p>
    </Panel>
  );
}
