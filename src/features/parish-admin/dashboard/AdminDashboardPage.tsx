// src/features/parish-admin/dashboard/AdminDashboardPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAttentionItems,
  getDashboardStats,
  getQuickActions,
  getRecentActivity,
  getTodayMasses,
  getUpcomingEvents,
} from "./api/dashboardApi";
import type {
  ActivityItem,
  AttentionItem,
  ChipTone,
  DashboardStat,
  DotTone,
  QuickAction,
  TodayMass,
  UpcomingEvent,
} from "./types";

const CHIP_TONE_CLASSES: Record<ChipTone, string> = {
  amber: "bg-amber-100 text-amber-700",
  gold: "bg-admin-gold-100 text-admin-gold-700",
  green: "bg-admin-green-100 text-admin-green-700",
};

const DOT_TONE_CLASSES: Record<DotTone, string> = {
  amber: "bg-amber-700",
  green: "bg-admin-green-700",
  gold: "bg-admin-gold-600",
};

const STATUS_TEXT_CLASSES: Record<DotTone, string> = {
  amber: "text-amber-700",
  green: "text-admin-green-700",
  gold: "text-admin-gold-700",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function AdminDashboardPage() {
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [todayMasses, setTodayMasses] = useState<TodayMass[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAttentionItems(),
      getDashboardStats(),
      getQuickActions(),
      getTodayMasses(),
      getRecentActivity(),
      getUpcomingEvents(),
    ]).then(([a, s, q, tm, act, up]) => {
      setAttention(a);
      setStats(s);
      setQuickActions(q);
      setTodayMasses(tm);
      setActivity(act);
      setUpcoming(up);
      setLoading(false);
    });
  }, []);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (loading) {
    return <p className="text-[13.5px] text-admin-ink-muted">Loading dashboard…</p>;
  }

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1.5 flex items-center gap-2 text-admin-gold-700">
          <SunIcon className="h-[15px] w-[15px]" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.3px]">{todayLabel}</span>
        </div>
        {/* TODO: swap "there" for the real signed-in staff first name once the current-user hook shape is confirmed */}
        <h1 className="font-serif text-[26px] font-semibold text-admin-ink">{greeting()}</h1>
        <p className="mt-1 text-[13.5px] text-admin-ink-muted">Here's what's happening at the parish today.</p>
      </div>

      {attention.length > 0 && (
        <div className="mb-[22px] flex items-start gap-4 rounded-[var(--radius)] border border-admin-green-100 border-l-4 border-l-admin-green-600 bg-admin-green-050 px-5 py-[18px]">
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px] bg-white text-admin-green-700">
            <AlertIcon className="h-[18px] w-[18px]" />
          </div>
          <div className="flex-1">
            <p className="mb-2.5 text-[14px] font-bold text-admin-green-900">Needs your attention</p>
            <div>
              {attention.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-4 py-2 ${
                    i < attention.length - 1 ? "border-b border-admin-gold-700/[0.18]" : ""
                  }`}
                >
                  <p className="text-[13.5px] leading-normal text-admin-ink-muted">
                    <strong className="text-admin-green-900">{item.boldText}</strong>
                    {item.restText}
                  </p>
                  <Link
                    to={item.ctaHref}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[12.5px] font-semibold ${
                      item.ctaVariant === "primary"
                        ? "bg-admin-green-700 text-white hover:bg-admin-green-900"
                        : "border border-admin-border-strong bg-admin-surface text-admin-ink hover:bg-admin-surface-alt"
                    }`}
                  >
                    {item.ctaLabel}
                    <ArrowRightIcon className="h-[14px] w-[14px]" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-[18px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.id}
            className="rounded-[var(--radius)] border border-admin-border bg-admin-surface p-4 shadow-[0_2px_8px_rgba(10,40,30,0.06)]"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div className={`flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg ${CHIP_TONE_CLASSES[s.chipTone]}`}>
                <StatIconGlyph icon={s.icon} className="h-[15px] w-[15px]" />
              </div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.4px] text-admin-ink-muted">{s.label}</p>
            </div>
            <p className="mb-1 font-serif text-[27px] font-semibold text-admin-green-900">{s.value}</p>
            <p className="text-[11.5px] text-admin-ink-faint">{s.delta}</p>
          </div>
        ))}
      </div>

      <div className="mb-[26px] flex flex-wrap gap-2.5">
        {quickActions.map((qa) => (
          <Link
            key={qa.id}
            to={qa.href}
            className="flex items-center gap-2 rounded-[9px] border border-admin-border bg-admin-surface-alt px-3.5 py-2.5 text-[13px] font-semibold text-admin-green-800 hover:border-admin-green-600 hover:bg-admin-green-050"
          >
            <QuickActionIconGlyph icon={qa.icon} className="h-[15px] w-[15px] text-admin-green-700" />
            {qa.label}
          </Link>
        ))}
      </div>

      <div className="mb-5 rounded-[var(--radius)] border border-admin-border bg-admin-surface p-5 shadow-[0_2px_8px_rgba(10,40,30,0.06)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">Today's Masses</p>
          <Link to="/schedule" className="text-[13px] font-semibold text-admin-green-700 hover:underline">
            Open full schedule
          </Link>
        </div>
        {todayMasses.length === 0 ? (
          <p className="px-0.5 py-1.5 text-[12.5px] text-admin-ink-faint">No Masses scheduled today.</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-0.5">
            {todayMasses.map((m) => (
              <Link
                key={m.id}
                to="/schedule"
                className="flex min-w-[150px] flex-shrink-0 items-center gap-2.5 rounded-[9px] border border-admin-border bg-admin-surface-alt px-3.5 py-2.5 hover:border-admin-green-600 hover:bg-admin-green-050"
              >
                <div>
                  <p className="whitespace-nowrap font-serif text-[14px] font-semibold text-admin-green-900">{m.time}</p>
                  <p className="whitespace-nowrap text-[11.5px] text-admin-ink-muted">{m.priest || "Unassigned"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface p-5 shadow-[0_2px_8px_rgba(10,40,30,0.06)]">
          <div className="mb-3.5 flex items-center justify-between">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">Recent activity</p>
            <span className="cursor-pointer text-[13px] font-semibold text-admin-green-700 hover:underline">View all</span>
          </div>
          <div>
            {activity.map((item, i) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-[3px] h-[11px] w-[11px] flex-shrink-0 rounded-full bg-admin-gold-600" />
                  {i < activity.length - 1 && <span className="mt-1 w-px flex-1 bg-admin-border-strong" />}
                </div>
                <div className="pb-4">
                  <p className="mb-0.5 text-[13.5px] font-semibold text-admin-ink">{item.title}</p>
                  <p className="text-[12px] leading-[1.6] text-admin-ink-muted">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface p-5 shadow-[0_2px_8px_rgba(10,40,30,0.06)]">
          <div className="mb-3.5 flex items-center justify-between">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">Upcoming events</p>
            <Link to="/schedule" className="text-[13px] font-semibold text-admin-green-700 hover:underline">
              View calendar
            </Link>
          </div>
          <div>
            {upcoming.map((ev, i) => (
              <div key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-[3px] h-[11px] w-[11px] flex-shrink-0 rounded-full ${DOT_TONE_CLASSES[ev.dotTone]}`} />
                  {i < upcoming.length - 1 && <span className="mt-1 w-px flex-1 bg-admin-border-strong" />}
                </div>
                <div className="pb-4">
                  <p className="mb-0.5 text-[13.5px] font-semibold text-admin-ink">{ev.title}</p>
                  <p className="text-[12px] leading-[1.6] text-admin-ink-muted">
                    {ev.date} · <span className={`font-semibold ${STATUS_TEXT_CLASSES[ev.dotTone]}`}>{ev.status}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatIconGlyph({ icon, className }: { icon: DashboardStat["icon"]; className?: string }) {
  switch (icon) {
    case "inbox":
      return <InboxIcon className={className} />;
    case "wallet":
      return <WalletIcon className={className} />;
    case "check":
      return <CheckIcon className={className} />;
    case "calendar":
      return <CalendarIcon className={className} />;
  }
}

function QuickActionIconGlyph({ icon, className }: { icon: QuickAction["icon"]; className?: string }) {
  switch (icon) {
    case "plus":
      return <PlusIcon className={className} />;
    case "file":
      return <FileIcon className={className} />;
    case "chart":
      return <ChartIcon className={className} />;
    case "scan":
      return <ScanIcon className={className} />;
  }
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
      <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinejoin="round" />
      <path
        d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M20 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1z" strokeLinejoin="round" />
      <path d="M17 12.5h.01" strokeLinecap="round" />
      <path d="M5 7V5a2 2 0 0 1 2-2h9" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" />
      <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" />
    </svg>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path
        d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
        strokeLinecap="round"
      />
      <line x1="7" y1="12" x2="17" y2="12" strokeLinecap="round" />
    </svg>
  );
}