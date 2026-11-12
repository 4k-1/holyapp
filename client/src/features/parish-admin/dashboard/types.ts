// src/features/parish-admin/dashboard/types.ts

/** The counts behind "Today's tasks", all from the dashboard's one request. */
export interface TaskCounts {
  /** Today, YYYY-MM-DD in the parish's time. */
  date: string;
  toReview: number;
  ready: number;
  intentionsToSchedule: number;
  pendingRecords: number;
  unassigned: number;
  massesToday: { time: string; intentions: number }[];
}

export type StatIcon = "inbox" | "wallet" | "check" | "calendar";
  export type ChipTone = "amber" | "gold" | "green";
  
  export interface DashboardStat {
    id: string;
    icon: StatIcon;
    chipTone: ChipTone;
    label: string;
    value: string;
    delta: string;
  }
  
  
  export interface TodayMass {
    id: string;
    time: string;
    priest: string;
  }
  
  export interface ActivityItem {
    id: string;
    title: string;
    meta: string;
  }
  
  export type DotTone = "amber" | "green" | "gold";
  
  export interface UpcomingEvent {
    id: string;
    title: string;
    date: string;
    status: string;
    dotTone: DotTone;
  }