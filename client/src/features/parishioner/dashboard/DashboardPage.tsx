import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { listRequests } from "@/features/parishioner/requests/api/requestsApi";
import { listMyMarriageApplications } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import { listMassSchedule, listMassTimesForDate } from "@/features/parishioner/intentions/api/massScheduleApi";
import { useAsync } from "@/hooks/useAsync";
import { deriveStatusKey } from "@/features/parishioner/dashboard/deriveStatusLabel";
import { dateStamp, nextMass } from "@/features/parishioner/dashboard/massTimes";
import { feeOf, peso, requestGroup, SACRAMENT_TITLES } from "@/features/parishioner/requests/requestDisplay";
import { GiveIcon, IntentionIcon } from "@/components/ui/icons/SacramentIcons";
import type { CertificateRequest, Parish } from "@/types";
import { Cloud } from "@/features/public/Cloud";

/** Fades the banner photo out on its left, top and bottom edges, so it melts into the panel with no visible border. */
const photoFade: CSSProperties = {
  maskImage:
    "linear-gradient(to right, transparent, #000 60%), linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
  maskComposite: "intersect",
  WebkitMaskImage:
    "linear-gradient(to right, transparent, #000 60%), linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
  WebkitMaskComposite: "source-in",
};

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface DashboardPageProps {
  parish: Parish;
  userName: string;
}

/** The parishioner's home: their parish and today's date first, then Mass times, the office, and their own requests. */
export function DashboardPage({ parish, userName }: DashboardPageProps) {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const base = `/${parish.slug}/portal`;

  const { data: requests = [] } = useAsync(() => listRequests(parish.id), [parish.id]);
  const { data: marriageApps = [] } = useAsync(() => listMyMarriageApplications(), [parish.id]);
  const { data: schedule = [] } = useAsync(() => listMassSchedule(), [parish.id]);
  const { data: masses, loading: massesLoading } = useAsync(
    () => Promise.all([listMassTimesForDate(dateStamp(now)), listMassTimesForDate(dateStamp(tomorrow))]),
    [parish.id]
  );
  const next = masses ? nextMass(masses[0].times, masses[1].times, now) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* HolyApp's logo teal, a shade deeper towards the bottom so white text stays at 5:1 or better; a soft glow,
          faint drawn clouds and white Plus Jakarta Sans, as on the sign-in pages. */}
      <section className="relative isolate overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#16798c_0%,#13697a_60%,#12606f_100%)] text-white shadow-[0_1px_2px_rgb(14_59_70/0.1),0_14px_32px_-14px_rgb(14_59_70/0.45)]">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 55% 60% at 90% 0%, rgba(142, 216, 210, 0.22), transparent 70%), radial-gradient(ellipse 45% 50% at 10% 0%, rgba(238, 181, 49, 0.1), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <Cloud className="bottom-[-38%] left-[-10%] w-[52%] opacity-[0.2]" drift={70} />
          <Cloud className="bottom-[-46%] right-[-12%] w-[48%] opacity-[0.16]" drift={85} delay={-30} flip />
        </div>
        {parish.photoUrl && (
          <img
            src={parish.photoUrl}
            alt=""
            className="absolute inset-y-0 right-0 -z-10 h-full w-[48%] object-cover object-[46%_40%] opacity-30 sm:w-[50%] sm:object-[40%_42%] lg:opacity-45"
            style={photoFade}
            aria-hidden="true"
          />
        )}
        <div
          className={`relative grid items-center gap-4 p-5 sm:p-8 ${
            parish.photoUrl ? "min-h-[200px] sm:min-h-[220px]" : "sm:grid-cols-[minmax(0,1fr)_auto] sm:pr-6"
          }`}
        >
          <div className="min-w-0">
            <h1 className="font-[Plus_Jakarta_Sans,ui-sans-serif,system-ui,sans-serif] text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[2.25rem]">
              {greeting(now)}, {userName}
            </h1>
            <p className="mt-1.5 text-[0.9375rem] text-white/90 sm:text-base">What would you like to do today?</p>
            <p className="mt-4 text-[0.875rem] font-semibold text-white">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          {!parish.photoUrl && <ChurchIllustration className="hidden h-[150px] w-auto sm:block lg:h-[170px]" />}
        </div>
      </section>

      <nav aria-label="Quick actions" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickAction
          to={`${base}/requests/new`}
          label="Request a certificate"
          hint="Baptism, confirmation, marriage"
          icon={<CertificateIcon />}
        />
        <QuickAction
          to={`${base}/intention`}
          label="Offer a Mass"
          hint="For a loved one or in thanksgiving"
          icon={<IntentionIcon className="h-5 w-5" />}
        />
        <QuickAction
          to={`${base}/donate`}
          label="Give to the parish"
          hint="Support the parish online"
          icon={<GiveIcon className="h-5 w-5" />}
        />
        <QuickAction
          to={`${base}/wallet`}
          label="My certificates"
          hint="Open your certificate wallet"
          icon={<WalletIcon />}
        />
      </nav>

      <RequestsSummary requests={requests} base={base} />

      {marriageApps.length > 0 && (
        <Link
          to={`${base}/marriage`}
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-[0.9375rem] shadow-[var(--shadow-card)] hover:bg-surface-alt sm:px-5"
        >
          <span className="min-w-0">
            <span className="font-semibold text-ink">Marriage application</span>
            <span className="text-ink-muted">
              {" "}
              · {marriageApps[0].groomName} & {marriageApps[0].brideName}
            </span>
          </span>
          <span className="shrink-0 font-semibold text-primary">View →</span>
        </Link>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Mass times" icon={<ChurchIcon />}>
          <div className="rounded-xl bg-primary/[0.06] px-4 py-3.5">
            <p className="text-[0.8125rem] font-semibold text-primary">Next Mass</p>
            {massesLoading ? (
              <p className="mt-0.5 text-[0.9375rem] text-ink-muted">Checking the schedule…</p>
            ) : !masses ? (
              <p className="mt-0.5 text-[0.9375rem] text-ink-muted">The schedule couldn't be loaded. Try again later.</p>
            ) : next ? (
              <>
                <p className="mt-0.5 text-[1.375rem] font-bold leading-tight text-ink">
                  {next.when}, {next.time}
                </p>
                {next.later.length > 0 && (
                  <p className="mt-1 text-[0.875rem] text-ink-muted">Also at {next.later.join(" · ")}</p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-[0.9375rem] text-ink-muted">No Masses are scheduled today or tomorrow.</p>
            )}
          </div>

          {schedule.some((entry) => entry.times.length > 0) && (
            <dl className="mt-4 divide-y divide-border">
              {schedule
                .filter((entry) => entry.times.length > 0)
                .map((entry) => (
                  <div key={entry.dayType} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
                    <dt className="text-[0.875rem] font-semibold text-ink">{entry.label}</dt>
                    <dd className="text-[0.875rem] tabular-nums text-ink-muted">{entry.times.join(" · ")}</dd>
                  </div>
                ))}
            </dl>
          )}
        </Card>

        <ParishOfficeCard parish={parish} />
      </div>
    </div>
  );
}

function QuickAction({
  to,
  label,
  hint,
  icon,
}: {
  to: string;
  label: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[104px] flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 sm:flex-row sm:items-center sm:gap-3.5"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary group-hover:text-white"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-bold leading-snug text-ink">{label}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">{hint}</span>
      </span>
    </Link>
  );
}

/** One line on the parishioner's certificate requests: what needs doing, or how many are moving. */
function RequestsSummary({ requests, base }: { requests: CertificateRequest[]; base: string }) {
  if (requests.length === 0) return null;
  const attention = requests.filter((r) => requestGroup(r) === "attention");
  const active = requests.filter((r) => requestGroup(r) === "active");

  let message: ReactNode;
  if (attention.length > 0) {
    const first = attention[0];
    const fee = feeOf(first);
    const what =
      deriveStatusKey(first) === "awaiting_payment"
        ? `Pay${fee ? ` ${peso(fee)}` : ""} for your ${SACRAMENT_TITLES[first.sacramentType].toLowerCase()}`
        : `Your ${SACRAMENT_TITLES[first.sacramentType].toLowerCase()} is ready for pickup`;
    message = (
      <>
        <span className="font-semibold text-ink">
          {attention.length === 1 ? "1 request needs your attention" : `${attention.length} requests need your attention`}
        </span>
        <span className="text-ink-muted"> · {what}</span>
      </>
    );
  } else if (active.length > 0) {
    message = (
      <span className="font-semibold text-ink">
        {active.length === 1 ? "1 certificate request in progress" : `${active.length} certificate requests in progress`}
      </span>
    );
  } else {
    message = <span className="text-ink">Your certificate requests are all complete.</span>;
  }

  return (
    <Link
      to={`${base}/requests`}
      className={`mt-5 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-[0.9375rem] shadow-[var(--shadow-card)] sm:px-5 ${
        attention.length > 0 ? "border-[#e8c98a] bg-[#fbf3e1] hover:bg-[#f8ecd2]" : "border-border bg-surface hover:bg-surface-alt"
      }`}
    >
      <span className="min-w-0">{message}</span>
      <span className="shrink-0 font-semibold text-primary">My requests →</span>
    </Link>
  );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 text-[1.125rem] font-bold text-ink">
        <span className="text-primary" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ParishOfficeCard({ parish }: { parish: Parish }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${parish.name}, ${parish.address}`)}`;
  const rows: { label: string; value: ReactNode }[] = [];
  if (parish.address) rows.push({ label: "Address", value: parish.address });
  if (parish.contact) {
    rows.push({
      label: "Phone",
      value: (
        <a href={`tel:${parish.contact.replace(/[^\d+]/g, "")}`} className="font-semibold text-primary hover:underline">
          {parish.contact}
        </a>
      ),
    });
  }
  if (parish.email) {
    rows.push({
      label: "Email",
      value: (
        <a href={`mailto:${parish.email}`} className="break-all font-semibold text-primary hover:underline">
          {parish.email}
        </a>
      ),
    });
  }

  return (
    <Card title="Parish office" icon={<PinIcon />}>
      {rows.length > 0 ? (
        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-[0.8125rem] text-ink-muted">{row.label}</dt>
              <dd className="text-[0.9375rem] leading-snug text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[0.9375rem] text-ink-muted">The parish hasn't added its contact details yet.</p>
      )}
      {parish.address && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-[0.875rem] font-semibold text-ink hover:bg-surface-alt sm:w-auto"
        >
          Get directions
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </Card>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function CertificateIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M4 7a2 2 0 0 1 2-2h11v4" />
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChurchIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M12 2v4M10 4h4" />
      <path d="M6 21V11l6-4 6 4v10" />
      <path d="M3 21h18M10 21v-4a2 2 0 0 1 4 0v4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

/** A small parish church in the HolyApp colours, for the greeting banner. */
function ChurchIllustration({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 260 170" className={className} aria-hidden="true">
      <circle cx="206" cy="40" r="22" fill="#eeb531" opacity="0.9" />
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="62" cy="34" rx="22" ry="8" />
        <ellipse cx="80" cy="28" rx="14" ry="8" />
        <ellipse cx="226" cy="74" rx="16" ry="6" />
      </g>
      <ellipse cx="130" cy="160" rx="122" ry="10" fill="#16798c" opacity="0.55" />
      <circle cx="40" cy="128" r="22" fill="#2a9d9c" />
      <circle cx="58" cy="138" r="16" fill="#1d7480" />
      <rect x="38" y="138" width="4" height="20" rx="2" fill="#0e3b46" />
      <circle cx="222" cy="130" r="20" fill="#2a9d9c" />
      <rect x="220" y="140" width="4" height="18" rx="2" fill="#0e3b46" />
      <rect x="72" y="92" width="116" height="66" rx="3" fill="#ffffff" />
      <path d="M64 96 130 58l66 38z" fill="#0e4a57" />
      <rect x="112" y="40" width="36" height="58" fill="#f6fbfb" />
      <path d="M106 44 130 22l24 22z" fill="#0e4a57" />
      <rect x="128" y="2" width="4" height="22" rx="1.5" fill="#eeb531" />
      <rect x="121" y="9" width="18" height="4" rx="1.5" fill="#eeb531" />
      <circle cx="130" cy="66" r="8" fill="#8ed8d2" stroke="#0e4a57" strokeWidth="2" />
      <path d="M118 158v-26a12 12 0 0 1 24 0v26z" fill="#c98f1a" />
      <path d="M130 120v38" stroke="#a87412" strokeWidth="1.5" />
      <g fill="#8ed8d2" stroke="#0e4a57" strokeWidth="1.5">
        <path d="M86 132v-14a6 6 0 0 1 12 0v14z" />
        <path d="M162 132v-14a6 6 0 0 1 12 0v14z" />
      </g>
      <rect x="110" y="156" width="40" height="4" rx="1" fill="#dce7e9" />
    </svg>
  );
}
