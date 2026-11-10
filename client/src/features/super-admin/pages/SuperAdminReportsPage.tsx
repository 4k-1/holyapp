import { useMemo, useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { getPlatformDashboard } from "@/features/super-admin/api/superAdminApi";
import {
  ChurchIcon,
  ClipboardIcon,
  ReportIcon,
  SealIcon,
  UsersIcon,
} from "@/components/ui/icons/AdminIcons";
import { SuperAdminToast, saBtnPrimary, saBtnSecondary } from "@/features/super-admin/components/SuperAdminModal";

const RANGES = [
  { id: "month", label: "This Month", hint: "this month", share: 0.14, turnaround: "1.8 days" },
  { id: "quarter", label: "This Quarter", hint: "this quarter", share: 0.42, turnaround: "2.1 days" },
  { id: "year", label: "This Year", hint: "this year", share: 1, turnaround: "2.4 days" },
] as const;

const REPORT_TYPES = [
  { id: "sacramental", icon: ReportIcon, name: "Sacramental Records Summary", desc: "Digitized baptismal, confirmation, marriage, and burial records by parish." },
  { id: "certificates", icon: SealIcon, name: "Certificate Issuance Report", desc: "Certificates issued, verified via QR, and pending requests across parishes." },
  { id: "performance", icon: ChurchIcon, name: "Parish Performance Report", desc: "Turnaround time, records digitized, and activity per parish." },
  { id: "audit", icon: ClipboardIcon, name: "Admin Activity & Audit Trail", desc: "Account creation, access changes, and system activity across parishes." },
  { id: "compliance", icon: ReportIcon, name: "Compliance Report (RA 10173)", desc: "Data privacy and retention compliance snapshot for diocesan review." },
  { id: "admins", icon: UsersIcon, name: "Parish Admin Directory", desc: "Full list of admin accounts, assigned parishes, and account status." },
];

const INITIAL_RECENT = [
  { name: "Parish Performance Report — Q2 2026", when: "July 1, 2026" },
  { name: "Certificate Issuance Report — June 2026", when: "June 28, 2026" },
  { name: "Sacramental Records Summary — June 2026", when: "June 22, 2026" },
  { name: "Compliance Report (RA 10173) — Q2 2026", when: "June 15, 2026" },
  { name: "Parish Admin Directory — June 2026", when: "June 10, 2026" },
];

export function SuperAdminReportsPage() {
  const { data } = useAsync(() => getPlatformDashboard(), []);
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]["id"]>("quarter");
  const [recent, setRecent] = useState(INITIAL_RECENT);
  const [toast, setToast] = useState("");

  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1];
  const records = Math.round((data?.recordTotal ?? 0) * range.share);
  const certs = Math.round((data?.certificateTotal ?? 0) * range.share);
  const parishes = data?.parishCount ?? 0;

  const sacramentTotal = data?.requestsBySacrament.reduce((s, x) => s + x.count, 0) || 1;
  const sacramentStops = useMemo(() => {
    if (!data) return "";
    let cursor = 0;
    return data.requestsBySacrament
      .map((s) => {
        const start = cursor;
        cursor += (s.count / sacramentTotal) * 360;
        return `${s.color} ${start}deg ${cursor}deg`;
      })
      .join(", ");
  }, [data, sacramentTotal]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-md border border-admin-border bg-white p-[3px]">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeId(r.id)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-bold ${
                rangeId === r.id ? "bg-admin-green-700 text-white" : "text-admin-ink-muted hover:bg-admin-green-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${saBtnPrimary} inline-flex items-center gap-1.5`}
          onClick={() => flash(`Report export started — ${range.hint}`)}
        >
          Export Report
        </button>
      </div>

      <div className="mb-[18px] grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Stat label="Records Digitized" value={records.toLocaleString()} sub={`${range.hint}`} />
        <Stat label="Certificates Issued" value={certs.toLocaleString()} sub={`${range.hint}`} />
        <Stat label="Parishes Reporting" value={String(parishes)} sub="of total registered" />
        <Stat label="Avg. Turnaround" value={range.turnaround} sub="per certificate request" warn />
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        <div className="rounded-lg border border-admin-border bg-admin-surface p-[18px]">
          <h3 className="m-0 text-[13.5px] font-bold text-admin-ink">Requests by Sacrament Type</h3>
          <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">Share of all certificate requests this period</p>
          <div
            className="mx-auto mt-5 h-[140px] w-[140px] rounded-full"
            style={{ background: `conic-gradient(${sacramentStops || "#e6ebe6 0deg 360deg"})` }}
          />
          <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {(data?.requestsBySacrament ?? []).map((s) => (
              <span key={s.key} className="text-[11.3px] text-admin-ink-muted">
                <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label} — {Math.round((s.count / sacramentTotal) * 100)}%
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
          <div className="border-b border-admin-border px-[18px] py-4">
            <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">Parish Performance</h2>
            <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">Records, certificates, and turnaround by parish</p>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-admin-surface-alt">
                {["Parish", "Records", "Certificates", "Status"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-admin-border px-[18px] py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-admin-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.parishes ?? []).map((row) => (
                <tr key={row.parish.id}>
                  <td className="border-b border-admin-border px-[18px] py-3">
                    <p className="text-[13px] font-bold text-admin-ink">{row.parish.name}</p>
                    <p className="text-[11.3px] text-admin-ink-faint">{row.parish.address}</p>
                  </td>
                  <td className="border-b border-admin-border px-[18px] py-3 text-[13px]">{row.records.total}</td>
                  <td className="border-b border-admin-border px-[18px] py-3 text-[13px]">{row.certificateCount}</td>
                  <td className="border-b border-admin-border px-[18px] py-3">
                    <span className="rounded-full bg-admin-green-100 px-2.5 py-[3px] text-[11px] font-bold text-admin-green-900">
                      {row.admins.length ? "Active" : "Pending Setup"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
        <div className="border-b border-admin-border px-[18px] py-4">
          <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">Generate a Report</h2>
          <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">
            Choose a report type to compile from current system data
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 p-[18px] md:grid-cols-2 xl:grid-cols-3">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            return (
              <div key={rt.id} className="rounded-md border border-admin-border p-3.5">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-admin-green-100 text-admin-green-900">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="m-0 text-[13.3px] font-bold text-admin-ink">{rt.name}</h4>
                <p className="mt-1 text-[11.5px] leading-relaxed text-admin-ink-faint">{rt.desc}</p>
                <button
                  type="button"
                  className={`${saBtnSecondary} mt-2.5`}
                  onClick={() => {
                    const name = `${rt.name} — ${range.label}`;
                    setRecent((list) => [{ name, when: "Just now" }, ...list]);
                    flash(`${rt.name} generated`);
                  }}
                >
                  Generate Report
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
        <div className="border-b border-admin-border px-[18px] py-4">
          <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">Recently Generated</h2>
          <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">
            Reports compiled by Super Admin, most recent first
          </p>
        </div>
        <ul>
          {recent.map((rep) => (
            <li
              key={rep.name + rep.when}
              className="flex items-center justify-between gap-3 border-b border-admin-border px-[18px] py-3 last:border-b-0"
            >
              <div>
                <p className="text-[12.8px] font-bold text-admin-ink">{rep.name}</p>
                <p className="text-[11px] text-admin-ink-faint">Generated {rep.when}</p>
              </div>
              <button type="button" className={saBtnSecondary} onClick={() => flash(`Download started — ${rep.name}`)}>
                Download
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3.5 text-center text-[11px] text-admin-ink-faint">
        Figures are aggregated across parishes and exclude individually identifiable parishioner data.
      </p>
      <SuperAdminToast message={toast} />
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface px-4 pb-3.5 pt-4">
      <p className="text-[11.5px] font-semibold text-admin-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none text-admin-ink">{value}</p>
      <p className={`mt-1.5 text-[10.8px] font-semibold ${warn ? "text-[#8a5f00]" : "text-admin-ink-faint"}`}>{sub}</p>
    </div>
  );
}
