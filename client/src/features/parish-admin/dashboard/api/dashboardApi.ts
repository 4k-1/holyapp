// src/features/parish-admin/dashboard/api/dashboardApi.ts
import { apiFetch, ApiError } from "@/lib/api";
import type {
  ActivityItem,
  DashboardStat,
  DotTone,
  TaskCounts,
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
    intentionsUnconfirmed: number;
    /** Masses and events in the next 7 days with no priest or staff assigned. */
    unassigned: number;
  };
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
      /** Masses only: intentions offered at it. */
      intentions?: number;
    }[];
  }[];
  activity: { id: string; text: string; detail: string; at: string }[];
}

export interface DashboardView {
  tasks: TaskCounts;
  stats: DashboardStat[];
  todayMasses: TodayMass[];
  activity: ActivityItem[];
  upcoming: UpcomingEvent[];
}

/** Links, not data: where the header and shortcut buttons go. */
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
    tasks: {
      date: today?.date ?? "",
      toReview: stats.toReview,
      ready: stats.ready,
      intentionsToSchedule: stats.intentionsUnconfirmed,
      pendingRecords: stats.pendingRecords,
      unassigned: stats.unassigned,
      massesToday: (today?.items ?? [])
        .filter((item) => item.type === "mass")
        .map((item) => ({ time: item.start, intentions: item.intentions ?? 0 })),
    },
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
