// src/features/parish-admin/dashboard/api/dashboardApi.ts
import { delay } from "@/services/delay";
import {
  ATTENTION_ITEMS,
  DASHBOARD_STATS,
  QUICK_ACTIONS,
  RECENT_ACTIVITY,
  TODAY_MASSES,
  UPCOMING_EVENTS,
} from "@/services/mocks/dashboard.mock";
import type {
  ActivityItem,
  AttentionItem,
  DashboardStat,
  QuickAction,
  TodayMass,
  UpcomingEvent,
} from "../types";

export async function getAttentionItems(): Promise<AttentionItem[]> {
  await delay();
  return [...ATTENTION_ITEMS];
}

export async function getDashboardStats(): Promise<DashboardStat[]> {
  await delay();
  return [...DASHBOARD_STATS];
}

export async function getQuickActions(): Promise<QuickAction[]> {
  await delay(50);
  return [...QUICK_ACTIONS];
}

export async function getTodayMasses(): Promise<TodayMass[]> {
  await delay();
  return [...TODAY_MASSES];
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  await delay();
  return [...RECENT_ACTIVITY];
}

export async function getUpcomingEvents(): Promise<UpcomingEvent[]> {
  await delay();
  return [...UPCOMING_EVENTS];
}