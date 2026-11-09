// src/features/parish-admin/dashboard/api/dashboardApi.ts
import { apiFetch, ApiError } from "@/lib/api";
import type {
  ActivityItem,
  AttentionItem,
  DashboardStat,
  DotTone,
  QuickAction,
  TodayMass,
  UpcomingEvent,
} from "../types";

/** What GET /dashboard returns; turned into the dashboard's cards below. */
interface DashboardResponse {
  stats: {
    toReview: number;
    awaitingPayment: number;
    ready: number;
    releasedThisMonth: number;
    releasedLastMonth: number;
    pendingRecords: number;
  };
  attention: { id: string; bold: string; rest: string; href: string; cta: string }[];
  /** Today first, then the next six days. */
  week: {
    date: string;
    items: {
      id: string;
      start: string;
      title: string;
      type: string;
      assignee: string;
      recordStatus?: "Pending" | "Recorded";
    }[];
  }[];
  activity: { id: string; text: string; detail: string; at: string }[];
}

export interface DashboardView {
  attention: AttentionItem[];
  stats: DashboardStat[];
  quickActions: QuickAction[];
  todayMasses: TodayMass[];
  activity: ActivityItem[];
  upcoming: UpcomingEvent[];
}

/** Links, not data: where the header and shortcut buttons go. */
const QUICK_ACTIONS: QuickAction[] = [
  { id: "qa1", icon: "plus", label: "Add a record", href: "records/baptismal" },
  { id: "qa2", icon: "file", label: "Generate a certificate", href: "records/baptismal" },
  { id: "qa3", icon: "chart", label: "View reports", href: "reports/sacraments" },
  { id: "qa4", icon: "scan", label: "Browse digitized ledgers", href: "records/ledgers" },
];

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function compareMonths(thisMonth: number, lastMonth: number) {
  const diff = thisMonth - lastMonth;
  if (diff === 0) return "Same as last month";
  return `${diff > 0 ? "+" : ""}${diff} vs. last month`;
}

function eventStatus(recordStatus?: "Pending" | "Recorded"): { status: string; dotTone: DotTone } {
  if (recordStatus === "Pending") return { status: "Pending recording", dotTone: "amber" };
  if (recordStatus === "Recorded") return { status: "Recorded", dotTone: "green" };
  return { status: "Upcoming", dotTone: "gold" };
}

/** One request for the whole dashboard, shaped for its existing cards. */
export async function getDashboardView(): Promise<DashboardView> {
  let data: DashboardResponse;
  try {
    data = await apiFetch<DashboardResponse>("/dashboard");
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server.", { cause: err });
  }

  const { stats, week } = data;
  const [today, ...rest] = week;
  const weekEvents = week.flatMap((day) =>
    day.items.filter((item) => item.type !== "mass").map((item) => ({ ...item, date: day.date }))
  );

  return {
    attention: data.attention.map((item, index) => ({
      id: item.id,
      boldText: item.bold,
      restText: item.rest.startsWith(" ") ? item.rest : ` ${item.rest}`,
      ctaLabel: item.cta,
      ctaHref: item.href,
      ctaVariant: index === 0 ? "primary" : "secondary",
    })),
    stats: [
      {
        id: "pending",
        icon: "inbox",
        chipTone: "amber",
        label: "Pending requests",
        value: String(stats.toReview),
        delta: stats.ready ? `${stats.ready} ready to release` : "None ready to release",
      },
      {
        id: "topay",
        icon: "wallet",
        chipTone: "gold",
        label: "To be paid",
        value: String(stats.awaitingPayment),
        delta: "Waiting on the parishioner",
      },
      {
        id: "released",
        icon: "check",
        chipTone: "green",
        label: "Released this month",
        value: String(stats.releasedThisMonth),
        delta: compareMonths(stats.releasedThisMonth, stats.releasedLastMonth),
      },
      {
        id: "events",
        icon: "calendar",
        chipTone: "green",
        label: "Events this week",
        value: String(weekEvents.length),
        delta: stats.pendingRecords
          ? `${stats.pendingRecords} ${stats.pendingRecords === 1 ? "needs" : "need"} recording`
          : "All recorded",
      },
    ],
    quickActions: QUICK_ACTIONS,
    todayMasses: (today?.items ?? [])
      .filter((item) => item.type === "mass")
      .map((item) => ({ id: item.id, time: item.start, priest: item.assignee })),
    activity: data.activity.map((item) => ({
      id: item.id,
      title: item.text,
      meta: [item.detail, timeAgo(item.at)].filter(Boolean).join(" · "),
    })),
    upcoming: [...(today ? [today] : []), ...rest]
      .flatMap((day) =>
        day.items
          .filter((item) => item.type !== "mass")
          .map((item) => ({
            id: item.id,
            title: item.title,
            date: `${longDate(day.date)} · ${item.start}`,
            ...eventStatus(item.recordStatus),
          }))
      )
      .slice(0, 5),
  };
}
