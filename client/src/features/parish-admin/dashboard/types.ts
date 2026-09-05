// src/features/parish-admin/dashboard/types.ts

export interface AttentionItem {
    id: string;
    boldText: string;
    restText: string;
    ctaLabel: string;
    ctaHref: string;
    ctaVariant: "primary" | "secondary";
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
  
  export type QuickActionIcon = "plus" | "file" | "chart" | "scan";
  
  export interface QuickAction {
    id: string;
    icon: QuickActionIcon;
    label: string;
    href: string;
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