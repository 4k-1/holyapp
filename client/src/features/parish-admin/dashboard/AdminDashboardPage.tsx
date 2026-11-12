// src/features/parish-admin/dashboard/AdminDashboardPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { getDashboardView } from "./api/dashboardApi";
import { QuickActionsCard } from "./QuickActionsCard";
import { TodayTasksCard } from "./TodayTasksCard";
import type { ActivityItem, DashboardStat, DotTone, TaskCounts, TodayMass, UpcomingEvent } from "./types";
import "./AdminDashboardPage.css";

const PILL_TONE: Record<DotTone, string> = {
  amber: "admin-dash__pill admin-dash__pill--amber",
  green: "admin-dash__pill admin-dash__pill--ok",
  gold: "admin-dash__pill admin-dash__pill--gold",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function AdminDashboardPage() {
  const user = useCurrentUser();
  const [tasks, setTasks] = useState<TaskCounts | null>(null);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [todayMasses, setTodayMasses] = useState<TodayMass[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getDashboardView()
      .then((view) => {
        setTasks(view.tasks);
        setStats(view.stats);
        setTodayMasses(view.todayMasses);
        setActivity(view.activity);
        setUpcoming(view.upcoming);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Couldn't load the dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const firstName = user?.firstName?.trim() || "there";

  if (loading) {
    return <p className="admin-dash__muted text-admin-body">Loading dashboard…</p>;
  }
  if (loadError) {
    return (
      <p className="text-admin-body text-red-700" role="alert">
        {loadError}
      </p>
    );
  }

  return (
    <div className="admin-dash mx-auto w-full max-w-[1920px]">
      <header className="mb-6 sm:mb-7">
        <div>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            {greeting()}, {firstName}
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">
            {todayLabel} · parish desk overview
          </p>
        </div>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:mb-6 lg:grid-cols-4 lg:gap-4" aria-label="Overview counts">
        {stats.map((s) => (
          <AdminStatCard
            key={s.id}
            label={s.label}
            value={s.value}
            hint={s.delta}
            icon={<StatIconGlyph icon={s.icon} className="h-4 w-4" />}
          />
        ))}
      </section>

      {tasks && <TodayTasksCard counts={tasks} scope={user?.id ?? "office"} />}

      <QuickActionsCard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
        <section className="admin-dash__card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[0.95rem] font-semibold text-[var(--dash-ink)]">Recent activity</h2>
            <span className="admin-dash__pill admin-dash__pill--ok">Latest</span>
          </div>
          {activity.length === 0 && <p className="admin-dash__faint text-admin-support">Nothing recorded yet.</p>}
          <ul className="divide-y divide-[var(--dash-border)]">
            {activity.map((item) => (
              <li key={item.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                <span className="admin-dash__dot" aria-hidden />
                <div className="min-w-0">
                  <p className="text-admin-body font-medium text-[var(--dash-ink)]">{item.title}</p>
                  <p className="admin-dash__muted mt-0.5 text-admin-support leading-relaxed">{item.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-4 lg:gap-5">
          <section className="admin-dash__card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[0.95rem] font-semibold text-[var(--dash-ink)]">Today’s Masses</h2>
              <Link to="schedule" className="admin-dash__link">
                Schedule
              </Link>
            </div>
            {todayMasses.length === 0 ? (
              <p className="admin-dash__faint text-admin-support">No Masses scheduled today.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {todayMasses.map((m) => (
                  <Link key={m.id} to="schedule" className="admin-dash__nested flex items-center justify-between gap-3">
                    <div>
                      <p className="font-sans text-admin-body font-semibold tabular-nums text-[var(--dash-ink)]">
                        {m.time}
                      </p>
                      <p className="admin-dash__muted mt-0.5 text-admin-label">{m.priest || "Unassigned"}</p>
                    </div>
                    <span className="admin-dash__pill admin-dash__pill--ok">Mass</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="admin-dash__card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[0.95rem] font-semibold text-[var(--dash-ink)]">Upcoming events</h2>
              <Link to="schedule" className="admin-dash__link">
                Calendar
              </Link>
            </div>
            {upcoming.length === 0 && (
              <p className="admin-dash__faint text-admin-support">No events in the next 7 days.</p>
            )}
            <ul className="space-y-3">
              {upcoming.map((ev) => (
                <li key={ev.id} className="admin-dash__nested flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-admin-body font-medium text-[var(--dash-ink)]">{ev.title}</p>
                    <p className="admin-dash__muted mt-0.5 text-admin-support">{ev.date}</p>
                  </div>
                  <span className={PILL_TONE[ev.dotTone]}>{ev.status}</span>
                </li>
              ))}
            </ul>
          </section>
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

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M20 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1z" strokeLinejoin="round" />
      <path d="M17 12.5h.01" strokeLinecap="round" />
      <path d="M5 7V5a2 2 0 0 1 2-2h9" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} aria-hidden>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
